'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { newCustomerSchema } from '@/lib/schemas';
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
    const parsed = newCustomerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ message: "Datos de cliente inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { firstName, lastName, phone, email } = parsed.data;

    const newCustomerData = {
      id: `cust-${faker.string.uuid()}`,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email || null,
      order_count: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert(newCustomerData)
      .select()
      .single();

    if (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json({ message: 'Error al crear el cliente.', error: error.details || error.message }, { status: 500 });
    }

    return NextResponse.json(createdCustomer, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in customer creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
