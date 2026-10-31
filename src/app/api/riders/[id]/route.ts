'use server';

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { sendRiderDocumentsReceivedEmail } from '@/lib/notifications/rider-registration-emails';
import { readBearerToken, verifyRegistrationToken } from '@/lib/rider-registration-token';
import {
  buildRiderAdminTextColumns,
  buildRiderTextColumns,
  getRiderUploadKind,
  RIDER_AVATAR_FIELD,
  RIDER_DOCUMENT_COLUMNS,
  RIDER_MOTO_PHOTO_FIELDS,
  riderAdminTextSchema,
  riderSelfTextSchema,
  validateRiderUpload,
  type ValidatedUpload,
} from '@/lib/rider-self-service';

type RiderSupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Modo de escritura según la credencial:
 * - `rider`: token de registro del mismo repartidor. Lista blanca de repartidor (incluye envío final).
 * - `admin`: sesión admin válida. Lista blanca administrativa. Nunca cambia `status`.
 */
type WriteMode = 'rider' | 'admin';

function createRiderServiceClient(): RiderSupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: process.env.SUPABASE_SCHEMA! },
    },
  );
}

async function hasAdminSession(): Promise<boolean> {
  try {
    await requireAdminOperationSession();
    return true;
  } catch {
    return false;
  }
}

/** Sube un archivo validado con nombre generado en servidor (UUID). Nunca usa el nombre enviado por el cliente. */
async function uploadRiderFile(
  supabase: RiderSupabaseClient,
  riderId: string,
  validated: Extract<ValidatedUpload, { ok: true }>,
): Promise<string> {
  const bucket = process.env.SUPABASE_BUCKET;
  if (!bucket) throw new Error('El almacenamiento no está configurado.');

  const filePath = `riders/${riderId}/${randomUUID()}.${validated.ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, new Blob([validated.bytes], { type: validated.mime }), { upsert: false, contentType: validated.mime });

  if (error) throw new Error('No se pudo subir el archivo.');

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: riderId } = await params;

  if (!riderId) {
    return NextResponse.json({ message: 'Rider ID es requerido.' }, { status: 400 });
  }

  // Autorización: token de registro del mismo repartidor, o sesión admin.
  const registrationToken = readBearerToken(request);
  const tokenRiderId = registrationToken ? await verifyRegistrationToken(registrationToken) : null;

  let mode: WriteMode;
  if (tokenRiderId && tokenRiderId === riderId) {
    mode = 'rider';
  } else if (await hasAdminSession()) {
    mode = 'admin';
  } else if (tokenRiderId) {
    return NextResponse.json({ message: 'No tienes permiso para modificar este repartidor.' }, { status: 403 });
  } else {
    return NextResponse.json({ message: 'Autenticación requerida o enlace vencido.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Formulario inválido.' }, { status: 400 });
  }

  // Separar texto y archivos. Los campos fuera de la lista blanca del modo se ignoran (no se escriben).
  const textInput: Record<string, string> = {};
  const fileEntries: Array<{ field: string; file: File }> = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (value.size > 0) fileEntries.push({ field: key, file: value });
    } else if (value !== '') {
      textInput[key] = value;
    }
  }

  let textColumns: Record<string, string | number | boolean>;
  if (mode === 'rider') {
    const parsedText = riderSelfTextSchema.safeParse(textInput);
    if (!parsedText.success) {
      const firstIssue = parsedText.error.issues[0];
      return NextResponse.json({ message: firstIssue?.message ?? 'Datos inválidos.' }, { status: 400 });
    }
    textColumns = buildRiderTextColumns(parsedText.data);
  } else {
    const parsedText = riderAdminTextSchema.safeParse(textInput);
    if (!parsedText.success) {
      const firstIssue = parsedText.error.issues[0];
      return NextResponse.json({ message: firstIssue?.message ?? 'Datos inválidos.' }, { status: 400 });
    }
    textColumns = buildRiderAdminTextColumns(parsedText.data);
  }

  // `submit` sólo tiene efecto con el token del repartidor: envío final del wizard.
  const isFinalSubmit = mode === 'rider' && textInput.submit === 'true';

  // Validar todos los archivos antes de subir ninguno, para no dejar subidas parciales.
  const validatedUploads: Array<{ field: string; upload: Extract<ValidatedUpload, { ok: true }> }> = [];
  for (const { field, file } of fileEntries) {
    const kind = getRiderUploadKind(field);
    if (!kind) continue;

    const validated = await validateRiderUpload(file, kind);
    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }
    validatedUploads.push({ field, upload: validated });
  }

  const supabaseAdmin = createRiderServiceClient();

  try {
    const { data: existingRider, error: fetchError } = await supabaseAdmin
      .from('riders')
      .select('status, moto_photos, email, first_name, last_name')
      .eq('id', riderId)
      .single();

    if (fetchError || !existingRider) {
      return NextResponse.json({ message: 'No se pudo encontrar el repartidor para actualizar.' }, { status: 404 });
    }

    if (isFinalSubmit && existingRider.status !== 'incomplete') {
      return NextResponse.json({ message: 'Tu solicitud ya fue enviada.' }, { status: 409 });
    }

    const updateData: Record<string, unknown> = { ...textColumns };

    const motoPhotos: string[] = Array.isArray(existingRider.moto_photos) ? [...existingRider.moto_photos] : [];
    let hasMotoPhotoUpload = false;

    for (const { field, upload } of validatedUploads) {
      const url = await uploadRiderFile(supabaseAdmin, riderId, upload);

      if (field === RIDER_AVATAR_FIELD) {
        updateData.avatar1x1_url = url;
        updateData.avatar_1x1_url = url;
      } else if (RIDER_MOTO_PHOTO_FIELDS.has(field)) {
        hasMotoPhotoUpload = true;
        if (!motoPhotos.includes(url)) motoPhotos.push(url);
      } else {
        updateData[RIDER_DOCUMENT_COLUMNS[field]] = url;
      }
    }

    if (hasMotoPhotoUpload) {
      updateData.moto_photos = motoPhotos;
    }

    if (Object.keys(updateData).length === 0 && !isFinalSubmit) {
      return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updateData.updated_at = now;

    // Sólo el repartidor, con el envío final, pasa de `incomplete` a `pending_review` e invalida su token.
    // El admin nunca cambia el estado aquí: eso es `POST /api/riders/[id]/status`.
    if (isFinalSubmit) {
      updateData.status = 'pending_review';
      updateData.registration_token_expires_at = now;
    }

    // Sólo columnas no sensibles: nunca devolver password_hash ni tokens.
    const { data, error } = await supabaseAdmin
      .from('riders')
      .update(updateData)
      .eq('id', riderId)
      .select('id, status, updated_at')
      .single();

    if (error) {
      console.error('Error updating rider profile.');
      return NextResponse.json({ message: 'Error al actualizar el perfil.' }, { status: 500 });
    }

    if (isFinalSubmit) {
      // Best-effort con tiempo límite: no altera la respuesta.
      const fullName = [existingRider.first_name, existingRider.last_name].filter(Boolean).join(' ').trim();
      await sendRiderDocumentsReceivedEmail({
        email: existingRider.email,
        userName: fullName || 'repartidor',
      });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.', rider: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST rider API (update mode).');
    const message = error instanceof Error && error.message === 'No se pudo subir el archivo.'
      ? error.message
      : 'Error interno del servidor.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: riderId } = await params;

  // Sólo administradores: sesión admin vigente (401 si no hay sesión, 403 si no es admin).
  try {
    await requireAdminOperationSession();
  } catch (error) {
    if (error instanceof AdminSessionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'No se pudo verificar la sesión.' }, { status: 500 });
  }

  if (!riderId) {
    return NextResponse.json({ message: 'Rider ID es requerido.' }, { status: 400 });
  }

  const supabaseAdmin = createRiderServiceClient();

  try {
    const { data: riderRecord, error: fetchError } = await supabaseAdmin
      .from('riders')
      .select('user_id')
      .eq('id', riderId)
      .single();

    if (fetchError) {
      return NextResponse.json({ message: 'No se pudo encontrar el repartidor.' }, { status: 404 });
    }

    if (riderRecord?.user_id) {
      const { error: deleteUserError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', riderRecord.user_id);

      if (deleteUserError) {
        return NextResponse.json(
          { message: 'No se pudo eliminar el usuario asociado al repartidor.' },
          { status: 500 }
        );
      }
    }

    const { error: deleteRiderError } = await supabaseAdmin
      .from('riders')
      .delete()
      .eq('id', riderId);

    if (deleteRiderError) {
      return NextResponse.json({ message: 'Error al eliminar el repartidor.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Repartidor y usuario asociado eliminados con éxito.' }, { status: 200 });
  } catch {
    console.error('Unexpected error in DELETE rider API.');
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
