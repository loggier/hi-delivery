
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderApplicationSchema } from '@/lib/schemas';
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
        if (value) {
            rawData[key] = value;
        }
    }

    const validated = riderApplicationSchema.pick({ firstName: true, lastName: true, email: true, phoneE164: true, password: true, passwordConfirmation: true }).safeParse(rawData);

    if (!validated.success) {
      console.error("Validation errors:", validated.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos de creación de cuenta inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = validated.data;
    const riderId = `rider-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);

    // Create the Rider record first
    const newRiderForDb = {
      id: riderId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_e164: data.phoneE164,
      status: 'incomplete', // New status for partial registrations
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

    // In a real scenario, you'd create a proper User record and associate it.
    // For this mock, we'll just return the created rider data and shape it like a User object for the auth store.
    const userForSession = {
        id: createdRider.id,
        name: `${createdRider.first_name} ${createdRider.last_name}`,
        email: createdRider.email,
        created_at: createdRider.created_at,
        role_id: 'rider', // mock role
        status: 'ACTIVE'
    }

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", rider: userForSession }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
