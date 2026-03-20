import { sendPushToRiders, sendPushToWebUsers } from '@/lib/push-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type OrderPushEventType = 'dispatch_wave' | 'manual_assignment';

type SendOrderEventPushArgs = {
  orderId: string;
  type: OrderPushEventType;
  riderIds?: string[];
};

function shortDescription(value: string | null | undefined) {
  const text = (value ?? '').trim();
  if (!text) return '';
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

export async function sendOrderEventPushes({
  orderId,
  type,
  riderIds,
}: SendOrderEventPushArgs) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, status, customer_name, items_description, rider_id, active_notified_riders, business:business_id(name, user_id)',
    )
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  const businessName = order.business?.name?.toString().trim() || 'Hi Delivery';
  const customerName = order.customer_name?.toString().trim();
  const description = shortDescription(order.items_description?.toString());
  const targetRiderIds =
    riderIds && riderIds.length > 0
      ? riderIds
      : type === 'manual_assignment'
        ? [order.rider_id].filter(Boolean)
        : Array.isArray(order.active_notified_riders)
          ? order.active_notified_riders.map((value: unknown) => String(value))
          : [];

  if (!targetRiderIds.length) {
    const adminUserIds = await resolveOrderWebRecipients({
      businessUserId: order.business?.user_id?.toString(),
      supabaseAdmin,
    });
    await sendWebOrderNotification({
      type,
      orderId,
      businessName,
      customerName,
      description,
      userIds: adminUserIds,
    });
    return { sentCount: 0, failureCount: 0 };
  }

  const bodyBase =
    customerName && description
      ? `${customerName} • ${description}`
      : customerName || description || 'Tienes una nueva solicitud pendiente.';

  if (type === 'manual_assignment') {
    const riderResult = await sendPushToRiders({
      riderIds: targetRiderIds,
      title: `Pedido asignado • ${businessName}`,
      body: bodyBase,
      data: {
        kind: 'manual_assignment',
        orderId,
      },
    });
    const adminUserIds = await resolveOrderWebRecipients({
      businessUserId: order.business?.user_id?.toString(),
      supabaseAdmin,
    });
    await sendWebOrderNotification({
      type,
      orderId,
      businessName,
      customerName,
      description,
      userIds: adminUserIds,
    });
    return riderResult;
  }

  const riderResult = await sendPushToRiders({
    riderIds: targetRiderIds,
    title: `Nuevo pedido • ${businessName}`,
    body: bodyBase,
    data: {
      kind: 'dispatch_wave',
      orderId,
    },
  });
  const adminUserIds = await resolveOrderWebRecipients({
    businessUserId: order.business?.user_id?.toString(),
    supabaseAdmin,
  });
  await sendWebOrderNotification({
    type,
    orderId,
    businessName,
    customerName,
    description,
    userIds: adminUserIds,
  });
  return riderResult;
}

async function resolveOrderWebRecipients({
  businessUserId,
  supabaseAdmin,
}: {
  businessUserId?: string;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const userIds = new Set<string>();

  if (businessUserId) {
    userIds.add(businessUserId);
  }

  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id, role_id')
    .eq('role_id', 'role-admin')
    .eq('status', 'ACTIVE');

  for (const admin of admins ?? []) {
    const userId = admin.id?.toString();
    if (userId) {
      userIds.add(userId);
    }
  }

  return Array.from(userIds);
}

async function sendWebOrderNotification({
  type,
  orderId,
  businessName,
  customerName,
  description,
  userIds,
}: {
  type: OrderPushEventType;
  orderId: string;
  businessName: string;
  customerName?: string;
  description?: string;
  userIds: string[];
}) {
  const bodyBase =
    [customerName, description].filter(Boolean).join(' • ') ||
    'Tienes una actualización operativa.';

  const title =
    type === 'manual_assignment'
      ? `Asignación manual • ${businessName}`
      : `Nuevo dispatch • ${businessName}`;

  if (!userIds.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  return sendPushToWebUsers({
    userIds,
    title,
    body: bodyBase,
    data: {
      orderId,
      title,
      body: bodyBase,
      kind: type,
    },
  });
}

export async function sendOrderStatusWebPush({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, customer_name, items_description, business:business_id(name, user_id)',
    )
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  const businessName = order.business?.name?.toString().trim() || 'Hi Delivery';
  const customerName = order.customer_name?.toString().trim() || 'Cliente';
  const description = shortDescription(order.items_description?.toString());
  const recipients = await resolveOrderWebRecipients({
    businessUserId: order.business?.user_id?.toString(),
    supabaseAdmin,
  });

  if (!recipients.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  const title = `${mapStatusToTitle(status)} • ${businessName}`;
  const body = [customerName, description].filter(Boolean).join(' • ');

  return sendPushToWebUsers({
    userIds: recipients,
    title,
    body: body || `Pedido ${orderId}`,
    data: {
      orderId,
      status,
      kind: 'order_status',
      title,
      body: body || `Pedido ${orderId}`,
    },
  });
}

function mapStatusToTitle(status: string) {
  switch (status.trim().toLowerCase()) {
    case 'accepted':
      return 'Pedido aceptado';
    case 'at_store':
      return 'Rider en negocio';
    case 'picked_up':
      return 'Pedido recogido';
    case 'on_the_way':
    case 'out_for_delivery':
      return 'Pedido en ruta';
    case 'arrived_at_destination':
      return 'Rider en destino';
    case 'completed':
    case 'delivered':
      return 'Pedido entregado';
    case 'cancelled':
      return 'Pedido cancelado';
    default:
      return 'Actualización de pedido';
  }
}
