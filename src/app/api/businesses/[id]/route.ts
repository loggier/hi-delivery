

'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hashPassword } from '@/lib/auth-utils';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, businessId: string, fileName: string): Promise<string> {
    const filePath = `store/${businessId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET!)
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

async function parseBusinessFormData(
  formData: FormData,
  supabaseAdmin: any,
  businessId: string,
) {
  const parsedData: Record<string, any> = {};
  const fileFields = [
    'logo_url',
    'business_photo_facade_url',
    'business_photo_interior_url',
    'digital_menu_url',
    'owner_ine_front_url',
    'owner_ine_back_url',
    'tax_situation_proof_url',
  ];
  const numericFields = [
    'latitude',
    'longitude',
    'delivery_time_min',
    'delivery_time_max',
    'average_ticket',
  ];
  const booleanFields = ['has_delivery_service'];

  for (const fieldName of fileFields) {
    const value = formData.get(fieldName);
    if (value instanceof File && value.size > 0) {
      parsedData[fieldName] = await uploadFileAndGetUrl(
        supabaseAdmin,
        value,
        businessId,
        fieldName,
      );
    } else if (typeof value === 'string' && value.length > 0) {
      parsedData[fieldName] = value;
    }
  }

  for (const [key, value] of formData.entries()) {
    if (fileFields.includes(key) || value instanceof File) {
      continue;
    }

    if (numericFields.includes(key)) {
      if (value !== 'undefined' && value !== 'null' && value !== '') {
        parsedData[key] = Number(value);
      }
      continue;
    }
    if (booleanFields.includes(key)) {
      parsedData[key] = value === 'true';
      continue;
    }
    if (
      key === 'phone_whatsapp' &&
      typeof value === 'string' &&
      value.length >= 10 &&
      !value.startsWith('+52')
    ) {
      parsedData[key] = `+52${value}`;
      continue;
    }
    if (value !== undefined && value !== 'undefined' && value !== 'null') {
      parsedData[key] = value;
    }
  }

  return parsedData;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const businessId = params.id;
  if (!businessId) {
      return NextResponse.json({ message: 'Business ID es requerido.' }, { status: 400 });
  }

  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

  const formData = await request.formData();

  try {
    const updateData = await parseBusinessFormData(formData, supabaseAdmin, businessId);
    const password = updateData.password;
    const passwordConfirmation = updateData.passwordConfirmation;
    const ownerName = updateData.owner_name;
    const email = updateData.email;
    delete updateData.password;
    delete updateData.passwordConfirmation;
    delete updateData.owner_name;
    delete updateData.email;
    delete updateData.id;
    delete updateData.final_submission;

    if (Object.keys(updateData).length === 0 && !formData.has('final_submission') && !password && !ownerName) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 200 });
    }

    const { data: businessRecord, error: businessRecordError } = await supabaseAdmin
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .single();

    if (businessRecordError || !businessRecord?.user_id) {
      return NextResponse.json(
        { message: 'No se encontró el usuario asociado al negocio.' },
        { status: 404 },
      );
    }

    const userUpdateData: Record<string, any> = {};
    if (ownerName) userUpdateData.name = ownerName;
    if (email) userUpdateData.email = email;

    if ((password && password.length > 0) || Object.keys(userUpdateData).length > 0) {
      if (password && password.length > 0) {
        userUpdateData.password = await hashPassword(password);
      }

      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update(userUpdateData)
        .eq('id', businessRecord.user_id);

      if (userUpdateError) {
        return NextResponse.json(
          { message: userUpdateError.message || 'Error al actualizar el usuario asociado.' },
          { status: 500 },
        );
      }
    }

    updateData.updated_at = new Date().toISOString();

    if (formData.has('final_submission')) {
        updateData.status = 'PENDING_REVIEW';
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business profile:', error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el perfil.', error: error.details }, { status: 500 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.', business: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST business API (update mode):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
