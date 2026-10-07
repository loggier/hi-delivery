import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { apiError } from '@/lib/business-integrations/orders';
import { calculateBusinessShippingQuote } from '@/lib/business-integrations/shipping';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_BODY_BYTES = 4 * 1024;
const requestSchema = z.object({
  customer_location: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }).strict(),
}).strict();

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json(apiError('body_too_large', 'Request body too large'), 413);
  }

  let body: unknown;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY_BYTES) return json(apiError('body_too_large', 'Request body too large'), 413);
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return json(apiError('invalid_body', 'Invalid request body'), 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(apiError('invalid_body', 'Customer coordinates are required'), 400);

  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json(apiError(auth.code, auth.error), auth.status);

  try {
    const quote = await calculateBusinessShippingQuote(auth.access.businessId, parsed.data.customer_location);
    return json({
      data: {
        delivery_fee: quote.delivery_fee,
        currency: 'MXN',
        distance_meters: quote.distance_meters,
        duration_seconds: quote.duration_seconds,
        estimated_duration: quote.estimated_duration,
        distance_source: quote.distance_source,
      },
    });
  } catch {
    return json(apiError('service_unavailable', 'Unable to calculate shipping'), 503);
  }
}
