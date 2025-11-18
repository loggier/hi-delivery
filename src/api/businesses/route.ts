'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessAccountCreationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';
import type { User } from '@/types';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, businessId: string, fileName: string): Promise<string> {
    const filePath = `businesses/${businessId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from('hidelivery')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from('hidelivery').getPublicUrl(filePath);
    return data.publicUrl;
}


async function handleUpdateBusiness(request: Request, supabaseAdmin: any, businessId: string) {
  const formData = await request.formData();
  const updateData: Record<string, any> = {};

  try {
    // Process files first
    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            updateData[dbKey] = await uploadFileAndGetUrl(supabaseAdmin, value, businessId, key);
        }
    }

    // Process other fields
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File) && value !== null && value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        // Handle numeric and float fields that might come as strings from FormData
        if (['latitude', 'longitude'].includes(dbKey)) {
             updateData[dbKey] = parseFloat(value as string);
        } else if (key === 'phone_whatsapp' && typeof value === 'string' && !value.startsWith('+52')) {
            updateData[dbKey] = `+52${value}`;
        } else {
            updateData[dbKey] = value;
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    
    // If submitting the final step, change status
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

async function handleCreateBusiness(request: Request, supabaseAdmin: any) {
  const formData = await request.formData();
  
  const rawData: Record<string, any> = {};
  for(const [key, value] of formData.entries()) {
      rawData[key] = value;
  }

  const validated = businessAccountCreationSchema.safeParse(rawData);

  if (!validated.success) {
    console.error("Validation errors:", validated.error.flatten().fieldErrors);
    return NextResponse.json({ message: "Datos de creación de cuenta inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validated.data;
  let createdUserId: string | null = null;
  
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', 'Dueño de Negocio').single();
    if (roleError || !roleData) throw new Error("No se pudo encontrar el rol 'Dueño de Negocio'.");
    
    const ownerRoleId = roleData.id;
    const userId = `user-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);
    
    const userToCreate = {
      id: userId,
      name: data.owner_name,
      email: data.email,
      password: hashedPassword,
      role_id: ownerRoleId,
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
    };

    const { data: createdUser, error: userError } = await supabaseAdmin.from('users').insert(userToCreate).select().single();
    
    if (userError) {
      console.error("Error creating user for business:", userError);
      if (userError.code === '23505') {
          return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ message: userError.message || 'Error al crear la cuenta de usuario.', error: userError.details }, { status: 500 });
    }
    
    createdUserId = createdUser.id;

    const businessId = `biz-${faker.string.uuid()}`;
    const newBusinessForDb = {
      id: businessId,
      user_id: createdUser.id,
      owner_name: data.owner_name,
      email: data.email,
      status: 'INCOMPLETE' as const,
    };

    const { data: createdBusiness, error: insertError } = await supabaseAdmin
      .from('businesses')
      .insert(newBusinessForDb)
      .select()
      .single();

    if (insertError) {
        if (createdUserId) {
            await supabaseAdmin.from('users').delete().eq('id', createdUserId);
        }
        return NextResponse.json({ message: 'Error al crear el perfil del negocio.', error: insertError.message }, { status: 500 });
    }
    
    const userForSession: User = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        created_at: createdUser.created_at,
        role_id: createdUser.role_id,
        status: createdUser.status,
        avatar_url: createdUser.avatar_url,
    };

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa el perfil de tu negocio.", user: userForSession, businessId: createdBusiness.id }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in business registration API (create mode):', error);
    if (createdUserId) {
        await supabaseAdmin.from('users').delete().eq('id', createdUserId);
    }
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('id');

  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

  if (businessId) {
    return handleUpdateBusiness(request, supabaseAdmin, businessId);
  } else {
    return handleCreateBusiness(request, supabaseAdmin);
  }
}
