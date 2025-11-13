
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderApplicationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';

// Helper function to upload a file and return its public URL
async function uploadFile(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from('hidelivery')
        .upload(filePath, file);

    if (uploadError) {
        console.error(`Error uploading ${fileName}:`, uploadError);
        throw new Error(`No se pudo subir el archivo: ${fileName}.`);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from('hidelivery')
        .getPublicUrl(filePath);

    if (!urlData) {
        throw new Error(`No se pudo obtener la URL pública para: ${fileName}.`);
    }
    
    return urlData.publicUrl;
}

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
    
    const rawData = Object.fromEntries(formData.entries());
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
      password_hash: hashedPassword, // Store hash temporarily if you don't have a user table
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
    // For this mock, we'll just return the created rider data for the auth store.
    // The auth store expects a User object, so we'll shape it like one.
    const userForSession = {
        id: createdRider.id,
        name: `${createdRider.first_name} ${createdRider.last_name}`,
        email: createdRider.email,
        created_at: createdRider.created_at,
        role_id: 'rider-role', // mock role
        status: 'ACTIVE'
    }

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa tu perfil.", rider: userForSession }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
