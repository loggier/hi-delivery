'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderAccountCreationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';
import type { User } from '@/types';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
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

async function handleUpdateRider(request: Request, supabaseAdmin: any, riderId: string) {
  const formData = await request.formData();
  const updateData: Record<string, any> = {};
  const dateFields = ['birth_date', 'license_valid_until', 'policy_valid_until'];

  try {
    const { data: existingRiderData, error: fetchError } = await supabaseAdmin.from('riders').select('status, moto_photos').eq('id', riderId).single();
    
    if(fetchError) {
      console.error('Error fetching existing rider for update:', fetchError);
      return NextResponse.json({ message: 'No se pudo encontrar el repartidor para actualizar.' }, { status: 404 });
    }

    let motoPhotos: string[] = existingRiderData.moto_photos || [];

    // Procesar archivos primero
    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (key.startsWith('motoPhoto')) {
                const url = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
                // Evitar duplicados si se vuelve a subir
                if (!motoPhotos.includes(url)) {
                    motoPhotos.push(url);
                }
            } else {
                 updateData[dbKey] = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
            }
        }
    }
    
    if (motoPhotos.length > 0) {
        updateData['moto_photos'] = motoPhotos;
    }

    // Procesar otros campos
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if(key === 'hasHelmet' || key === 'hasUniform' || key === 'hasBox') {
            updateData[dbKey] = value === 'true';
        } else if (dateFields.includes(dbKey)) {
            updateData[dbKey] = new Date(value as string).toISOString();
        } else if (key !== 'brandOther') {
            updateData[dbKey] = value;
        }
      }
    }
    
    if (formData.get('brand') === 'Otra' && formData.get('brandOther')) {
        updateData['brand'] = formData.get('brandOther');
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    
    if (existingRiderData && existingRiderData.status === 'incomplete' && Object.keys(updateData).length > 1) { 
        updateData.status = 'pending_review';
    } else if (formData.has('status')) {
        updateData.status = formData.get('status');
    }

    const { data, error } = await supabaseAdmin
      .from('riders')
      .update(updateData)
      .eq('id', riderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rider profile:', error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el perfil.', error: error.details }, { status: 500 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.', rider: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST rider API (update mode):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

async function handleCreateRider(request: Request, supabaseAdmin: any) {
  const formData = await request.formData();
  
  const rawData: Record<string, any> = {};
  for(const [key, value] of formData.entries()) {
      rawData[key] = value;
  }

  const validated = riderAccountCreationSchema.safeParse(rawData);

  if (!validated.success) {
    console.error("Validation errors:", validated.error.flatten().fieldErrors);
    return NextResponse.json({ message: "Datos de creación de cuenta inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validated.data;
  let createdUserId: string | null = null;
  
  try {
    const riderRoleId = 'delivery-man';
    const userId = `user-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);
    
    const userToCreate = {
      id: userId,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: hashedPassword,
      role_id: riderRoleId,
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
    };

    const { data: createdUser, error: userError } = await supabaseAdmin.from('users').insert(userToCreate).select().single();
    
    if (userError) {
      console.error("Error creating user for rider:", userError);
      if (userError.code === '23505') {
          return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ message: userError.message || 'Error al crear la cuenta de usuario.', error: userError.details }, { status: 500 });
    }
    
    createdUserId = createdUser.id;

    const riderId = `rider-${faker.string.uuid()}`;
    const newRiderForDb = {
      id: riderId,
      user_id: createdUser.id,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_e164: data.phoneE164,
      status: 'incomplete' as const,
      password_hash: hashedPassword,
    };

    const { data: createdRider, error: insertError } = await supabaseAdmin
      .from('riders')
      .insert(newRiderForDb)
      .select()
      .single();

    if (insertError) {
        if (createdUserId) {
            await supabaseAdmin.from('users').delete().eq('id', createdUserId);
        }
        return NextResponse.json({ message: 'Error al crear el perfil del repartidor.', error: insertError.message }, { status: 500 });
    }
    
    const userForSession: User = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        created_at: createdUser.created_at,
        role_id: createdUser.role_id,
        status: createdUser.status,
    };

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", rider: userForSession, riderId: createdRider.id }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in rider registration API (create mode):', error);
    if (createdUserId) {
        await supabaseAdmin.from('users').delete().eq('id', createdUserId);
    }
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const riderId = searchParams.get('id');

  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

  if (riderId) {
    return handleUpdateRider(request, supabaseAdmin, riderId);
  } else {
    return handleCreateRider(request, supabaseAdmin);
  }
}