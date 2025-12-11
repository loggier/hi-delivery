
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessBranchSchema } from '@/lib/schemas';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const parsed = businessBranchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ message: "Datos de sucursal inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('business_branches')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
        console.error('Error updating business branch:', error);
        return NextResponse.json({ message: 'Error al actualizar la sucursal.', error: error.details || error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in branch update API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
