'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function getSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: process.env.SUPABASE_SCHEMA! },
    },
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { count: orderCount, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', id);

    if (ordersError) {
      throw ordersError;
    }

    if ((orderCount ?? 0) > 0) {
      return NextResponse.json(
        {
          message:
            'Este cliente tiene pedidos relacionados. No se puede eliminar sin afectar el historial; conserva el cliente para poder revisar sus pedidos.',
        },
        { status: 409 },
      );
    }

    const { error: addressesError } = await supabaseAdmin
      .from('customer_addresses')
      .delete()
      .eq('customer_id', id);

    if (addressesError) {
      throw addressesError;
    }

    const { error: customerError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);

    if (customerError) {
      throw customerError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error deleting customer:', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Error interno al eliminar el cliente.',
      },
      { status: 500 },
    );
  }
}
