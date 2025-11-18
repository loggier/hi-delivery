
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderAccountCreationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';

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
    const userId = `user-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);

    // 1. Crear el usuario en la tabla 'users'
    const newUserForDb = {
        id: userId,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: hashedPassword,
        role_id: 'delivery-man', // Usando el ID de rol proporcionado
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    };

    const { data: createdUser, error: userInsertError } = await supabaseAdmin
        .from('users')
        .insert(newUserForDb)
        .select()
        .single();
    
    if (userInsertError) {
      console.error("Error inserting user:", userInsertError);
      if (userInsertError.code === '23505') { // unique_violation
          return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Error al crear la cuenta de usuario.', error: userInsertError.message }, { status: 500 });
    }

    // 2. Crear el registro del repartidor en la tabla 'riders'
    const newRiderForDb = {
      id: `rider-${faker.string.uuid()}`,
      user_id: createdUser.id, // Vinculando al usuario recién creado
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_e164: data.phoneE164,
      status: 'incomplete' as const,
      password_hash: hashedPassword,
    };

    const { data: createdRider, error: riderInsertError } = await supabaseAdmin
      .from('riders')
      .insert(newRiderForDb)
      .select()
      .single();

    if (riderInsertError) {
      console.error("Error inserting rider:", riderInsertError);
      // Opcional: podrías eliminar el usuario recién creado para mantener la consistencia
      await supabaseAdmin.from('users').delete().eq('id', createdUser.id);
      return NextResponse.json({ message: 'Error al crear el perfil de repartidor.', error: riderInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
        message: "Cuenta creada con éxito. Ahora completa tu perfil.", 
        user: createdUser, // Devolvemos el objeto User para el estado de autenticación
        rider: createdRider // Devolvemos el repartidor para referencia futura
    }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
