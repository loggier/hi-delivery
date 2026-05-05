'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { faker } from '@faker-js/faker';
import { type OrderPayload } from '@/types';
import { sendOrderEventPushes } from '@/lib/push-order-events';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, orderId: string, fileName: string): Promise<string> {
  const filePath = `orders/${orderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).upload(filePath, file);

  if (uploadError) {
    throw new Error(`Error al subir ${fileName}: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
  return data.publicUrl;
}

function getFormDataFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is File => typeof File !== 'undefined' && value instanceof File && value.size > 0);
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: process.env.SUPABASE_SCHEMA! },
    }
  );

  try {
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    const rawData = isFormData ? await request.formData() : await request.json();

    const getValue = (key: string) =>
      isFormData ? (rawData as FormData).get(key) : (rawData as Record<string, any>)[key];

    const items = parseMaybeJson(getValue('items'));
    const pickupAddress = parseMaybeJson(getValue('pickup_address')) as OrderPayload['pickup_address'];
    const deliveryAddress = parseMaybeJson(getValue('delivery_address')) as OrderPayload['delivery_address'];
    const routePath = parseMaybeJson(getValue('route_path'));
    const ticketPhoto = getValue('ticket_photo');
    const ticketPhotos = isFormData ? getFormDataFiles(rawData as FormData, 'ticket_photos') : [];
    const ticketPhotoFile = typeof File !== 'undefined' && ticketPhoto instanceof File && ticketPhoto.size > 0 ? ticketPhoto : null;
    const ticketPhotoFiles = [...(ticketPhotoFile ? [ticketPhotoFile] : []), ...ticketPhotos].slice(0, 5);

    if (ticketPhotoFiles.some((photo) => !photo.type.startsWith('image/'))) {
      return NextResponse.json(
        { message: 'La foto del ticket debe ser una imagen.' },
        { status: 400 }
      );
    }

    const subtotal = parseNumber(getValue('subtotal'));
    const deliveryFee = parseNumber(getValue('delivery_fee'));
    const readyInMinutes = parseNumber(getValue('ready_in_minutes'), NaN);
    const hasReadyInMinutes = Number.isFinite(readyInMinutes) && readyInMinutes > 0;

    if (hasReadyInMinutes || ticketPhotoFiles.length > 0) {
      const { error: fieldsError } = await supabaseAdmin
        .from('orders')
        .select('ticket_photo_url, ticket_photo_urls, ready_in_minutes')
        .limit(1);

      if (fieldsError) {
        return NextResponse.json(
          {
            message: 'Faltan campos en la tabla de órdenes. Ejecuta src/sql/2026-04-29_shipping_order_fields.sql en el servidor.',
            error: fieldsError.message,
          },
          { status: 500 }
        );
      }
    }

    const orderId = `ord-${faker.string.uuid()}`;
    const orderPayload: OrderPayload & { items: any[] } = {
      business_id: String(getValue('business_id') || ''),
      customer_id: String(getValue('customer_id') || ''),
      status: (getValue('status') || 'pending_acceptance') as OrderPayload['status'],
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      customer_name: String(getValue('customer_name') || ''),
      customer_phone: String(getValue('customer_phone') || ''),
      subtotal,
      delivery_fee: deliveryFee,
      order_total: subtotal + deliveryFee,
      distance: parseNumber(getValue('distance')),
      items_description: typeof getValue('items_description') === 'string' ? String(getValue('items_description')) : undefined,
      route_path: routePath,
      ready_in_minutes: hasReadyInMinutes ? readyInMinutes : null,
      ticket_photo: ticketPhotoFile,
      ticket_photos: ticketPhotoFiles,
      items: Array.isArray(items) ? items : [],
    };

    const { items: orderItems, ...orderInput } = orderPayload;

    const { data: newOrder, error } = await supabaseAdmin.rpc('create_order_with_items', {
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
      items_in: orderItems,
    }).single();

    if (error) {
      console.error('Error in create_order_with_items RPC:', error);
      return NextResponse.json(
        {
          message: 'Error al crear el pedido en la base de datos.',
          error: error.message,
        },
        { status: 500 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (orderInput.ready_in_minutes) {
      updatePayload.ready_in_minutes = orderInput.ready_in_minutes;
    }

    if (ticketPhotoFiles.length > 0) {
      const uploadedTicketPhotos = await Promise.all(
        ticketPhotoFiles.map((file, index) =>
          uploadFileAndGetUrl(supabaseAdmin, file, orderId, `ticket_photo_${index + 1}`),
        )
      );
      updatePayload.ticket_photo_url = uploadedTicketPhotos[0];
      updatePayload.ticket_photo_urls = uploadedTicketPhotos;
    }

    const updateResult = Object.keys(updatePayload).length > 0
      ? await supabaseAdmin.from('orders').update(updatePayload).eq('id', orderId)
      : { error: null };

    if (updateResult.error) {
      return NextResponse.json(
        {
          message: `La orden se creó, pero no se pudo guardar la información adicional. Detalle: ${updateResult.error.message}`,
          error: updateResult.error.message,
        },
        { status: 500 }
      );
    }

    try {
      await sendOrderEventPushes({
        orderId,
        type: 'dispatch_wave',
      });
    } catch (pushError) {
      console.error('Push dispatch after order creation failed:', pushError);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in order creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
