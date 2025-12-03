
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyPassword, hashPassword } from '@/lib/auth-utils';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import type { User, Role } from '@/types';

type UserData = {
  id: string;
  password?: string;
  status: 'ACTIVE' | 'INACTIVE';
  role_id: string;
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son requeridos.' }, { status: 400 });
    }
    
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA! },
      }
    );
  

    const { data: user, error: userError }: PostgrestSingleResponse<UserData> = await supabaseAdmin
      .from('users')
      .select('id, password, status, role_id')
      .eq('email', email)
      .single();
      
    if (userError || !user || !user.password) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    if (user.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'El usuario se encuentra inactivo.' }, { status: 403 });
    }

    // --- Lógica de Auto-Hasheo ---
    // Si la contraseña en la BD no parece un hash, la hasheamos y actualizamos.
    // Esto es útil para el primer inicio de sesión del usuario master.
    const isHashed = user.password.startsWith('$2a$');
    if (!isHashed) {
      if (password === user.password) {
        const newHashedPassword = await hashPassword(password);
        await supabaseAdmin
          .from('users')
          .update({ password: newHashedPassword })
          .eq('id', user.id);
      } else {
         return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
      }
    }
    // --- Fin de la lógica ---

    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Fetch complete user profile with role and permissions
    const { data: fullUser, error: fullUserError } = await supabaseAdmin
      .from('users')
      .select('*, role:roles(*, role_permissions(*))')
      .eq('id', user.id)
      .single();
    
    if(fullUserError || !fullUser) {
        return NextResponse.json({ message: 'Error interno: no se pudo encontrar el perfil del usuario.' }, { status: 500 });
    }
    
    // If user is a Business Owner, attach their business ID to the session user object
    if (fullUser.role?.name === 'Dueño de Negocio') {
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', fullUser.id)
        .single();
      
      if (businessData) {
        (fullUser as User).business_id = businessData.id;
      }
    }
    
    // Remove password from the returned user object
    delete (fullUser as any).password;

    return NextResponse.json({ message: 'Inicio de sesión exitoso', user: fullUser as User }, { status: 200 });

  } catch (error) {
    console.error('Error inesperado en la API de Login:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
