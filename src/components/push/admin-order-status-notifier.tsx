"use client";

import { useEffect, useRef } from 'react';

import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';

const INTERESTING_STATUSES = new Set([
  'accepted',
  'at_store',
  'cooking',
  'ready_for_pickup',
  'picked_up',
  'out_for_delivery',
  'on_the_way',
  'arrived_at_destination',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'failed',
]);

function getStatusLabel(status: string) {
  switch (status) {
    case 'accepted':
      return 'Pedido aceptado';
    case 'at_store':
      return 'Rider en el negocio';
    case 'cooking':
      return 'Pedido en preparación';
    case 'ready_for_pickup':
      return 'Pedido listo para recoger';
    case 'picked_up':
      return 'Pedido recogido';
    case 'out_for_delivery':
    case 'on_the_way':
      return 'Pedido en camino';
    case 'arrived_at_destination':
      return 'Rider en destino';
    case 'completed':
    case 'delivered':
      return 'Pedido entregado';
    case 'cancelled':
      return 'Pedido cancelado';
    case 'refunded':
      return 'Pedido reembolsado';
    case 'failed':
      return 'Pedido fallido';
    default:
      return 'Actualización de pedido';
  }
}

export function AdminOrderStatusNotifier() {
  const { user, isAuthenticated } = useAuthStore();
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user || typeof window === 'undefined') {
      return;
    }

    if (!('Notification' in window)) {
      return;
    }

    const permissionPromptKey = 'hid-admin-order-notifications-prompted';
    if (
      Notification.permission === 'default' &&
      !window.localStorage.getItem(permissionPromptKey)
    ) {
      window.localStorage.setItem(permissionPromptKey, '1');
      void Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const supabase = createClient();
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    const channel = supabase
      .channel(`grupohubs-admin-order-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema,
          table: 'orders',
        },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          const previous = payload.old as Record<string, unknown>;
          const orderId = record.id?.toString();
          const newStatus = record.status?.toString().toLowerCase() ?? '';
          const oldStatus = previous.status?.toString().toLowerCase() ?? '';

          if (!orderId || !INTERESTING_STATUSES.has(newStatus)) {
            return;
          }
          if (newStatus === oldStatus) {
            return;
          }

          const dedupeKey = `${orderId}:${newStatus}`;
          if (seenEventsRef.current.has(dedupeKey)) {
            return;
          }
          seenEventsRef.current.add(dedupeKey);

          const customerName =
            record.customer_name?.toString().trim() || 'Cliente';
          const notification = new Notification(getStatusLabel(newStatus), {
            body: `${customerName} • Pedido ${orderId}`,
            icon: '/logo-hid.png',
            tag: dedupeKey,
          });

          notification.onclick = () => {
            window.focus();
            window.location.href = `/orders/${orderId}`;
          };
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  return null;
}
