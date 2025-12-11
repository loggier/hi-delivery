'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessBranchSchema } from '@/lib/schemas';

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
    
    // Validar el payload completo, incluyendo el ID que viene del cliente.
    const parsed = businessBranchSchema.safeParse(json);

    if (!parsed.success) {
      console.error("Validation errors on branch creation:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos de sucursal inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // Insertar el objeto 'parsed.data' que ya contiene el ID.
    const { data, error } = await supabaseAdmin
      .from('business_branches')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
        console.error('Error creating business branch:', error);
        return NextResponse.json({ message: 'Error al crear la sucursal.', error: error.details || error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in branch creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
