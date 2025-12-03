
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hashPassword } from '@/lib/auth-utils';
import { updateUserSchema } from '@/lib/schemas';

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
    
    const parsed = updateUserSchema.safeParse(json);

    if (!parsed.success) {
      console.error("Validation Errors:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos proporcionados no válidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // Desestructuramos para separar los campos que no van a la BD
    const { password, passwordConfirmation, ...updateData } = parsed.data;
    
    const finalUpdateData: Record<string, any> = { ...updateData };

    // Manejo de contraseña por separado
    if (password && password.length > 0) {
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
      return NextResponse.json({ message: error.message || 'Error al actualizar el usuario.' }, { status: 500 });
    }
    
    // Nos aseguramos de no devolver el hash de la contraseña al cliente
    if (data.password) {
        delete data.password;
    }

    return NextResponse.json(data);
    
  } catch (e) {
    const error = e as Error;
    console.error("Unexpected Error:", error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
