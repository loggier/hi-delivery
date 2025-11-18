
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderAccountCreationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );
    
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
    
    // 1. Get 'Repartidor' role ID
    const { data: roleData, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', 'Repartidor').single();
    if(roleError || !roleData) {
        console.error("Role 'Repartidor' not found:", roleError);
        return NextResponse.json({ message: 'Error interno: El rol "Repartidor" no está configurado en el sistema.' }, { status: 500 });
    }
    const riderRoleId = roleData.id;

    // 2. Create the user record
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
      if (userError.code === '23505') { // unique_violation for email
          return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Error al crear la cuenta de usuario.', error: userError.message }, { status: 500 });
    }

    // 3. Create the rider record linked to the user
    const riderId = `rider-${faker.string.uuid()}`;
    const newRiderForDb = {
      id: riderId,
      user_id: createdUser.id, // Link to the user table
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_e164: data.phoneE164,
      status: 'incomplete' as const,
      password_hash: hashedPassword, // Storing hash here as well, might be redundant but keeping schema
    };

    const { data: createdRider, error: insertError } = await supabaseAdmin
      .from('riders')
      .insert(newRiderForDb)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting rider profile:", insertError);
      // Optional: Rollback user creation if rider creation fails
      await supabaseAdmin.from('users').delete().eq('id', createdUser.id);
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

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", rider: userForSession }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
