

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
    const orderId = `ord-${faker.string.uuid().substring(0, 8).toUpperCase()}`;

    // 1. Insertar la orden principal
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        ...orderInput
      })
      .select()
      .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
        return NextResponse.json({
            message: "Error al crear el pedido en la base de datos.",
            error: orderError.message
        }, { status: 500 });
    }

    // 2. Preparar e insertar los items de la orden
    if (items && items.length > 0) {
        const orderItemsToInsert = items.map(item => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            item_description: item.item_description,
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsToInsert);

        if (itemsError) {
             // Si falla la inserción de items, eliminamos la orden principal para mantener la consistencia
            await supabaseAdmin.from('orders').delete().eq('id', orderId);
            console.error('Error creating order items:', itemsError);
            return NextResponse.json({
                message: "Error al guardar los productos del pedido.",
                error: itemsError.message
            }, { status: 500 });
        }
    }

    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
