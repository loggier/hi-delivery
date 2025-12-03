
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { type OrderPayload } from '@/types';

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
    const orderData: OrderPayload & { items: any[] } = await request.json();
    
    // Separar los items del resto del payload de la orden.
    const { items, ...orderInput } = orderData;

    // Llamar a la función RPC, pasando los items como un parámetro separado (items_in).
    const { data: newOrder, error } = await supabaseAdmin.rpc('create_order_with_items', {
        business_id_in: orderInput.business_id,
        customer_id_in: orderInput.customer_id,
        pickup_address_in: orderInput.pickup_address,
        delivery_address_in: orderInput.delivery_address,
        customer_name_in: orderInput.customer_name,
        customer_phone_in: orderInput.customer_phone,
        items_description_in: orderInput.items_description,
        subtotal_in: orderInput.subtotal,
        delivery_fee_in: orderInput.delivery_fee,
        order_total_in: orderInput.order_total,
        distance_in: orderInput.distance,
        status_in: orderInput.status,
        items_in: items, // Este es el parámetro para los items.
    }).single();
    
    if (error) {
      console.error('Error creating order with items:', error);
      return NextResponse.json({ message: 'Error al crear el pedido en la base de datos.', error: error.message }, { status: 500 });
    }

    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
