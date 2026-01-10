

'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { type OrderPayload, type Rider } from '@/types';
import { faker } from '@faker-js/faker';

// --- Lógica de Asignación de Pedidos (CORE-HID) ---

type ScoredRider = Rider & { score: number };

// Función para calcular la distancia Haversine en KM
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findBestRidersForOrder(
  supabase: ReturnType<typeof createServerClient>,
  pickupLocation: { lat: number; lng: number }
): Promise<ScoredRider[]> {
    
  // 1. Obtener repartidores candidatos
  const { data: candidates, error: candidatesError } = await supabase
    .from('riders')
    .select(`
      *,
      orders:orders!left(
        status,
        created_at,
        completed_at
      )
    `)
    .eq('is_active_for_orders', true)
    .neq('last_latitude', null)
    .neq('last_longitude', null);
    
  if (candidatesError) {
    console.error("Error fetching rider candidates:", candidatesError);
    return [];
  }

  if (!candidates || candidates.length === 0) {
    console.log("No active riders found.");
    return [];
  }
  
  const now = new Date();
  
  // 2. Calcular puntaje para cada candidato
  const scoredRiders = candidates
    .map(rider => {
      let score = 1000; // Puntaje base

      // Factor 1: Distancia (Ponderación Alta)
      const distanceToPickup = getDistanceInKm(rider.last_latitude!, rider.last_longitude!, pickupLocation.lat, pickupLocation.lng);
      if (distanceToPickup > 10) { // Descalificar si está a más de 10km
          return null;
      }
      score -= distanceToPickup * 50; // Penalización fuerte por distancia

      // Factor 2: Carga de Trabajo (Ponderación Media)
      const activeOrders = rider.orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
      if (activeOrders >= 2) {
          return null; // Descalificar si ya tiene 2 o más pedidos
      }
      if (activeOrders === 1) {
          score -= 150; // Penalización por tener 1 pedido activo
      }
      
      // Factor 3: Tiempo desde última asignación (Factor de Justicia)
      const lastOrderCompletion = rider.orders.length > 0
          ? rider.orders.reduce((latest, order) => {
              const completedAt = order.completed_at ? new Date(order.completed_at) : new Date(0);
              return completedAt > latest ? completedAt : latest;
            }, new Date(0))
          : new Date(0);
          
      if (lastOrderCompletion.getTime() > 0) {
        const minutesSinceLastOrder = (now.getTime() - lastOrderCompletion.getTime()) / (1000 * 60);
        score += Math.min(minutesSinceLastOrder, 60) * 2; // Bonificación por tiempo de espera (máx 120 puntos)
      } else {
        score += 120; // Bonificación máxima para repartidores nuevos o sin pedidos completados
      }
      
      return { ...rider, score };
    })
    .filter((r): r is ScoredRider => r !== null); // Filtrar nulos (descalificados)

  // 3. Ordenar por puntaje descendente
  scoredRiders.sort((a, b) => b.score - a.score);

  return scoredRiders;
}

async function assignOrder(
    supabase: ReturnType<typeof createServerClient>,
    order: { id: string, pickup_address: { coordinates: { lat: number, lng: number } } }
) {
    console.log(`[ASSIGNMENT-CORE] Starting assignment process for order ${order.id}`);
    
    const bestRiders = await findBestRidersForOrder(supabase, order.pickup_address.coordinates);

    if (bestRiders.length === 0) {
        console.log(`[ASSIGNMENT-CORE] No suitable riders found for order ${order.id}.`);
        // Opcional: Marcar el pedido para asignación manual
        // await supabase.from('orders').update({ status: 'assignment_failed' }).eq('id', order.id);
        return;
    }

    // Estrategia: Notificar a los 3 mejores (o los que haya si son menos)
    const ridersToNotify = bestRiders.slice(0, 3);
    const riderIdsToNotify = ridersToNotify.map(r => r.id);
    
    console.log(`[ASSIGNMENT-CORE] Top ${ridersToNotify.length} candidates for order ${order.id}:`, ridersToNotify.map(r => ({id: r.id, score: r.score})));

    // Actualizar el pedido con los repartidores notificados para no volver a notificarles
    const { error: updateError } = await supabase
        .from('orders')
        .update({ notified_riders: riderIdsToNotify })
        .eq('id', order.id);
        
    if (updateError) {
        console.error(`[ASSIGNMENT-CORE] Error updating notified_riders for order ${order.id}:`, updateError);
    }
    
    // --- SIMULACIÓN DE NOTIFICACIÓN PUSH ---
    // En una implementación real, aquí se llamaría a un servicio como FCM
    // para enviar la notificación a los dispositivos de `ridersToNotify`.
    console.log(`[ASSIGNMENT-CORE] SIMULATING: Sending push notification for order ${order.id} to riders:`, riderIdsToNotify);
    // -----------------------------------------
}


// --- API Route Handler ---

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

    // Paso 1: Insertar la orden principal
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

    // Paso 2: Preparar e insertar los items de la orden
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
    
    // Paso 3: Iniciar la lógica de asignación (sin esperar a que termine)
    assignOrder(supabaseAdmin, newOrder);

    // Devolvemos la respuesta inmediatamente al cliente.
    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
