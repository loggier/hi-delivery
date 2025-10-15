'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyPassword } from '@/lib/auth-utils';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import type { User, Role } from '@/types';

type UserData = {
  id: string;
  password?: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleId: string;
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
      .select('id, password, status, roleId')
      .eq('email', email)
      .single();
      
    if (userError || !user || !user.password) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    if (user.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'El usuario se encuentra inactivo.' }, { status: 403 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Fetch complete user profile to send to client, excluding password
    const { data: fullUser, error: fullUserError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, avatarUrl, roleId, status, createdAt')
      .eq('id', user.id)
      .single();
    
    if(fullUserError || !fullUser) {
        return NextResponse.json({ message: 'Error interno: no se pudo encontrar el perfil del usuario.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Inicio de sesión exitoso', user: fullUser as User }, { status: 200 });

  } catch (error) {
    console.error('Error inesperado en la API de Login:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
