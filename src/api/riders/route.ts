
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
    const riderId = `rider-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);

    // Crear el registro del repartidor con los datos del primer paso
    const newRiderForDb = {
      id: riderId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_e164: data.phoneE164,
      status: 'incomplete' as const, // Nuevo estado para registros parciales
      password_hash: hashedPassword,
    };

    const { data: createdRider, error: insertError } = await supabaseAdmin
      .from('riders')
      .insert(newRiderForDb)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting rider:", insertError);
      if (insertError.code === '23505') { // unique_violation
          return NextResponse.json({ message: 'El correo electrónico o teléfono ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Error al crear la cuenta en la base de datos.', error: insertError.message }, { status: 500 });
    }

    // Devolver un objeto con el formato de usuario para la sesión del cliente
    const userForSession = {
        id: createdRider.id,
        name: `${createdRider.first_name} ${createdRider.last_name}`,
        email: createdRider.email,
        avatar_url: '',
        created_at: createdRider.created_at,
        role_id: 'rider', // rol temporal para el estado de la app
        status: 'ACTIVE' as const
    }

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", rider: userForSession }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
