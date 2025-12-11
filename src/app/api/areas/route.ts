
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { areaSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
  );

  try {
    const json = await request.json();
    
    // Validamos que el payload completo, incluyendo el ID, sea correcto.
    const parsed = areaSchema.safeParse(json);

    if (!parsed.success) {
      console.error("Validation errors on area creation:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos de área inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // El ID ya viene generado desde el frontend, así que lo usamos directamente.
    const { data: newArea, error } = await supabaseAdmin
      .from('areas')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
        console.error('Error creating area:', error);
        return NextResponse.json({ message: 'Error al crear el área.', error: error.details || error.message }, { status: 500 });
    }

    return NextResponse.json(newArea, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in area creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
