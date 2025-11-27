
'use server'

import { createServerActionClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { OrderPayload } from "@/types"
import { faker } from "@faker-js/faker"
import { revalidatePath } from "next/cache"

export async function createOrderAction(payload: OrderPayload) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuario no autenticado." };
  }

  const orderId = `ord-${faker.string.uuid()}`;

  try {
    const orderToInsert = {
      id: orderId,
      business_id: payload.business_id,
      customer_id: payload.customer_id,
      pickup_address: payload.pickup_address,
      delivery_address: payload.delivery_address,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      items_description: payload.items.map(i => `${i.quantity}x ${i.product_id}`).join(', '),
      subtotal: payload.subtotal,
      delivery_fee: payload.delivery_fee,
      order_total: payload.order_total,
      distance: payload.distance,
      status: 'pending_acceptance' as const,
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderToInsert)
      .single();
    
    if (orderError) throw orderError;
    
    const orderItemsToInsert = payload.items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsError) throw itemsError;

    const { error: eventError } = await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'pending'
    });
    if (eventError) throw eventError;

    revalidatePath('/(admin)/pos');

    return { success: true, error: null };

  } catch (error: any) {
    console.error("Error creating order:", error);
    return { success: false, error: error.message || "Un error desconocido ocurrió." };
  }
}
