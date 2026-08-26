import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  revokeCurrentAdminWebSession,
} from '@/lib/auth/admin-session';

export async function POST() {
  try {
    await revokeCurrentAdminWebSession();
    return NextResponse.json({ ok: true });
  } catch {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(ADMIN_SESSION_COOKIE);
    } catch {
      // The response remains safe if cookie headers cannot be mutated.
    }

    return NextResponse.json(
      { ok: false, message: 'No se pudo cerrar la sesión de forma segura.' },
      { status: 500 },
    );
  }
}
