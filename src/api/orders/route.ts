
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { type OrderPayload } from '@/types';
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
    const orderData: OrderPayload & { items: any[] } = await request.json();
    
    const { items, ...orderInput } = orderData;
    const orderId = `ord-${faker.string.uuid()}`;

    // Llamar a la función RPC para insertar la orden y sus items.
    // Se elimina el .single() para no depender de la estructura de retorno de la función,
    // que es la causa del error "structure of query does not match function result type".
    const { error } = await supabaseAdmin.rpc('create_order_with_items', {
        order_id_in: orderId,
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
        route_path_in: orderInput.route_path,
        items_in: items,
    });
    
    if (error) {
      console.error('Error creating order with items:', error);
      return NextResponse.json({ message: 'Error al crear el pedido en la base de datos.', error: error.message }, { status: 500 });
    }

    // Si no hay error, construimos el objeto de respuesta manualmente con los datos que ya tenemos.
    const createdOrderResponse = {
      id: orderId,
      ...orderInput,
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(createdOrderResponse, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
