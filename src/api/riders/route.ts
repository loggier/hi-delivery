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
        .from("hidelivery")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from("hidelivery").getPublicUrl(filePath);
    return data.publicUrl;
}

export async function POST(request: Request) {
  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

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

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", user: userForSession, riderId: createdRider.id }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in rider registration API (create mode):', error);
    if (createdUserId) {
        await supabaseAdmin.from('users').delete().eq('id', createdUserId);
    }
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
