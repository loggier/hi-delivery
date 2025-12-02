
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
    const orderData: OrderPayload = await request.json();

    // The RPC function will handle the transaction of creating the order and its items.
    const { data: newOrder, error } = await supabaseAdmin.rpc('create_order_with_items', {
        business_id_in: orderData.business_id,
        customer_id_in: orderData.customer_id,
        pickup_address_in: orderData.pickup_address,
        delivery_address_in: orderData.delivery_address,
        customer_name_in: orderData.customer_name,
        customer_phone_in: orderData.customer_phone,
        items_description_in: orderData.items_description,
        subtotal_in: orderData.subtotal,
        delivery_fee_in: orderData.delivery_fee,
        order_total_in: orderData.order_total,
        distance_in: orderData.distance,
        status_in: orderData.status,
        items_in: orderData.items,
    }).single();
    
    if (error) {
      console.error('Error creating order with items:', error);
      return NextResponse.json({ message: 'Error al crear el pedido en la base de datos.', error: error.message }, { status: 500 });
    }

    // After a successful order creation, you might want to invalidate caches or trigger notifications.
    // For now, we just return the newly created order.
    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
