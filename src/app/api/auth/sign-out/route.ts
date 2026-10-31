import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  revokeCurrentAdminWebSession,
} from '@/lib/auth/admin-session';
import { clearOwnerSessionCookie } from '@/lib/auth/owner-session';

export async function POST() {
  // La cookie del dueño se borra siempre, aunque falle la revocación admin.
  try {
    await clearOwnerSessionCookie();
  } catch {
    // Cookie headers inmutables en algunos contextos; no bloquea el cierre.
  }

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
