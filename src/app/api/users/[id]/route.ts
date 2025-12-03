
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
    
    // Omitimos email porque no se puede cambiar, y las contraseñas para manejarlas por separado.
    const parsed = userSchema.omit({email: true, password: true, passwordConfirmation: true}).safeParse(json);

    if (!parsed.success) {
      console.error("Validation Errors:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos proporcionados no válidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // El objeto base para actualizar solo tiene campos seguros que existen en la BD.
    const finalUpdateData: Record<string, any> = { ...parsed.data };

    // Manejo de contraseña por separado
    if (json.password && typeof json.password === 'string' && json.password.length > 0) {
        if (json.password !== json.passwordConfirmation) {
            return NextResponse.json({ message: "Las contraseñas no coinciden." }, { status: 400 });
        }
        finalUpdateData.password = await hashPassword(json.password);
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(finalUpdateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el usuario.' }, { status: 500 });
    }

    const { password, ...userResponse } = data;
    return NextResponse.json(userResponse);
    
  } catch (e) {
    const error = e as Error;
    console.error("Unexpected Error:", error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
