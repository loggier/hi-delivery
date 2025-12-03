
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hashPassword } from '@/lib/auth-utils';
import { userSchema } from '@/lib/schemas';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!params.id) {
    return NextResponse.json({ message: 'User ID es requerido.' }, { status: 400 });
  }

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: process.env.SUPABASE_SCHEMA! },
    }
  );

  try {
    const json = await request.json();
    
    // Validamos los datos, pero omitimos 'email' ya que no se puede cambiar.
    const parsed = userSchema.omit({email: true}).safeParse(json);

    if (!parsed.success) {
      console.error("Validation Errors:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos proporcionados no válidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // Desestructuramos para separar los campos de contraseña y el resto.
    const { password, passwordConfirmation, ...updateData } = parsed.data;
    
    const finalUpdateData: Record<string, any> = updateData;

    if (password) {
        finalUpdateData.password = await hashPassword(password);
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(finalUpdateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      // Check for the specific error to avoid confusion
      if (error.message.includes('passwordConfirmation')) {
          return NextResponse.json({ message: 'Error interno: El campo passwordConfirmation no debería enviarse a la base de datos.' }, { status: 500 });
      }
      return NextResponse.json({ message: error.message || 'Error al actualizar el usuario.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    const error = e as Error;
    console.error("Unexpected Error:", error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
