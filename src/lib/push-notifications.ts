import { getFirebaseAdminMessaging } from '@/lib/firebase/firebase-admin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type PushPayload = {
  riderIds: string[];
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/mismatched-credential',
]);

function normalizeData(
  data: Record<string, string | number | boolean | null | undefined> = {},
) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

export async function sendPushToRiders({
  riderIds,
  title,
  body,
  data,
}: PushPayload) {
  const targetRiderIds = Array.from(
    new Set(riderIds.map((value) => value?.trim()).filter(Boolean)),
  ) as string[];

  if (!targetRiderIds.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: riders, error } = await supabaseAdmin
    .from('riders')
    .select('id, push_token')
    .in('id', targetRiderIds)
    .not('push_token', 'is', null);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(riders) ? riders : [];
  const tokens = rows
    .map((row) => ({
      riderId: row.id as string,
      token: row.push_token?.toString().trim() ?? '',
    }))
    .filter((row) => row.token.length > 0);

  if (!tokens.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  const tokenIndex = new Map(tokens.map((row) => [row.token, row.riderId]));
  const messaging = getFirebaseAdminMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((row) => row.token),
    notification: { title, body },
    data: normalizeData(data),
    android: {
      priority: 'high',
      notification: {
        channelId: 'hid_rider_trip_status',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
        },
      },
      headers: {
        'apns-priority': '10',
      },
    },
  });

  const invalidRiderIds = new Set<string>();
  response.responses.forEach((item, index) => {
    if (item.success) {
      return;
    }
    const code = item.error?.code;
    const riderId = tokenIndex.get(tokens[index].token);
    if (code && riderId && INVALID_TOKEN_ERROR_CODES.has(code)) {
      invalidRiderIds.add(riderId);
    }
  });

  if (invalidRiderIds.size > 0) {
    await supabaseAdmin
      .from('riders')
      .update({
        push_token: null,
        push_platform: null,
      })
      .in('id', Array.from(invalidRiderIds));
  }

  return {
    sentCount: response.successCount,
    failureCount: response.failureCount,
  };
}

export async function sendPushToWebUsers({
  userIds,
  title,
  body,
  data,
}: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}) {
  const targetUserIds = Array.from(
    new Set(userIds.map((value) => value?.trim()).filter(Boolean)),
  ) as string[];

  if (!targetUserIds.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, web_push_token')
    .in('id', targetUserIds)
    .not('web_push_token', 'is', null);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(users) ? users : [];
  const tokens = rows
    .map((row) => ({
      userId: row.id as string,
      token: row.web_push_token?.toString().trim() ?? '',
    }))
    .filter((row) => row.token.length > 0);

  if (!tokens.length) {
    return { sentCount: 0, failureCount: 0 };
  }

  const tokenIndex = new Map(tokens.map((row) => [row.token, row.userId]));
  const messaging = getFirebaseAdminMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((row) => row.token),
    notification: { title, body },
    data: normalizeData(data),
    webpush: {
      notification: {
        title,
        body,
        icon: '/logo-hid.png',
      },
      fcmOptions: {
        link: data?.orderId ? `/orders/${data.orderId}` : '/orders',
      },
    },
  });

  const invalidUserIds = new Set<string>();
  response.responses.forEach((item, index) => {
    if (item.success) {
      return;
    }
    const code = item.error?.code;
    const userId = tokenIndex.get(tokens[index].token);
    if (code && userId && INVALID_TOKEN_ERROR_CODES.has(code)) {
      invalidUserIds.add(userId);
    }
  });

  if (invalidUserIds.size > 0) {
    await supabaseAdmin
      .from('users')
      .update({
        web_push_token: null,
        web_push_token_updated_at: new Date().toISOString(),
      })
      .in('id', Array.from(invalidUserIds));
  }

  return {
    sentCount: response.successCount,
    failureCount: response.failureCount,
  };
}
