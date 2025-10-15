import { NextResponse } from 'next/server';
import { users, roles } from '@/mocks/data'; // We'll use our mock data for now
import { User } from '@/types';

// In a real app, this would involve password hashing and database checks
// For now, we simulate it based on the master-user.sql script
const MOCK_MASTER_USER_EMAIL = "master@grupohubs.com";
const MOCK_MASTER_USER_PASS = "supersecret";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son requeridos.' }, { status: 400 });
    }
    
    // Simulate checking the master user
    if (email.toLowerCase() === MOCK_MASTER_USER_EMAIL && password === MOCK_MASTER_USER_PASS) {
        const user = users.find(u => u.email === 'admin@example.com'); // Find the base admin user from mock data
        if (user) {
             const sessionData = {
                id: user.id,
                email: email, // Use the email provided on login
                name: user.name,
                roleId: user.roleId,
                status: user.status,
                avatarUrl: user.avatarUrl,
            };
             return NextResponse.json({ message: 'Inicio de sesión exitoso', user: sessionData }, { status: 200 });
        }
    }

    // In a real app, you would query Supabase here.
    // For now, we'll just return an error if it's not the master user.
    return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });

  } catch (error) {
    console.error('Error en la API de Login:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
