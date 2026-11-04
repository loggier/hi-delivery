import { NextResponse } from 'next/server';

import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';
import { buildDeliveryProofPath, getDeliveryProofBucket } from '@/lib/rider-proof-storage';
import { validateRiderUpload } from '@/lib/rider-self-service';

/** Estados desde los que el repartidor puede completar la entrega (y por tanto subir evidencia). */
const PROOF_UPLOAD_STATUSES = ['picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination'];

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Sube la evidencia de entrega (foto) del pedido al bucket privado. Valida tamaño (5 MB), firma binaria y tipo.
 * El nombre lo genera el servidor. Responde sólo con el `path`, nunca con una URL pública.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const { id: orderId } = await context.params;
  if (!ORDER_ID_PATTERN.test(orderId)) {
    return NextResponse.json({ message: 'Pedido inválido.' }, { status: 400 });
  }

  const { data: order, error } = await access.supabase
    .from('orders')
    .select('id, rider_id, status')
    .eq('id', orderId)
    .maybeSingle();
  if (error) return NextResponse.json({ message: 'No se pudo consultar el pedido.' }, { status: 502 });
  if (!order || order.rider_id !== access.riderId) {
    return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
  }
  if (!PROOF_UPLOAD_STATUSES.includes(String(order.status ?? '').toLowerCase())) {
    return NextResponse.json({ message: 'El pedido no está en un estado que requiera evidencia.' }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Formulario inválido.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Envía la foto en el campo "file".' }, { status: 400 });
  }

  const validated = await validateRiderUpload(file, 'image');
  if (!validated.ok) {
    return NextResponse.json({ message: validated.message }, { status: 400 });
  }
  if (validated.ext === 'pdf') {
    return NextResponse.json({ message: 'La evidencia debe ser una imagen JPG, PNG o WEBP.' }, { status: 400 });
  }

  const path = buildDeliveryProofPath(orderId, access.riderId, validated.ext);
  const { error: uploadError } = await access.supabase.storage
    .from(getDeliveryProofBucket())
    .upload(path, new Blob([validated.bytes], { type: validated.mime }), {
      upsert: false,
      contentType: validated.mime,
    });

  if (uploadError) {
    return NextResponse.json({ message: 'No se pudo guardar la evidencia.' }, { status: 502 });
  }

  return NextResponse.json({ path }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
