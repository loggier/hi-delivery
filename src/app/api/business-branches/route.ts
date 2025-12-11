
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessBranchSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';

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
    // We only expect the DTO, so we parse against the base schema without the ID
    const parsed = businessBranchSchema.omit({ id: true }).safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ message: "Datos de sucursal inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const dataToInsert = {
      ...parsed.data,
      id: `br-${faker.string.uuid()}`, // Generate ID here
    };

    const { data, error } = await supabaseAdmin
      .from('business_branches')
      .insert(dataToInsert)
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
