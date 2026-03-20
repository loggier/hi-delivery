"use client";

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';

import {
  getFirebaseWebMessaging,
  getFirebaseWebVapidKey,
  hasFirebaseWebConfig,
} from '@/lib/firebase/firebase-web';
import { useAuthStore } from '@/store/auth-store';

async function persistWebToken(userId: string, token: string | null) {
  await fetch('/api/push/web-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, token }),
  });
}

export function AdminWebPushBootstrap() {
  const { user, isAuthenticated } = useAuthStore();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || typeof window === 'undefined') {
      return;
    }

    if (!('Notification' in window)) {
      return;
    }

    let unsubscribeForeground: (() => void) | undefined;

    const setup = async () => {
      if (!hasFirebaseWebConfig()) {
        return;
      }

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permission !== 'granted') {
        return;
      }

      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (error) {
          console.error('Web push service worker registration failed:', error);
        }
      }

      const messaging = await getFirebaseWebMessaging();
      const vapidKey = getFirebaseWebVapidKey();
      if (!messaging || !vapidKey) {
        return;
      }

      try {
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        if (token && token !== lastTokenRef.current) {
          await persistWebToken(user.id, token);
          lastTokenRef.current = token;
        }
      } catch (error) {
        console.error('Web push token registration failed:', error);
      }

      unsubscribeForeground = onMessage(messaging, (payload) => {
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          'Hi Delivery';
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          'Tienes una actualización nueva.';
        const orderId = payload.data?.orderId;

        const notification = new Notification(title, {
          body,
          icon: '/logo-hid.png',
          tag: orderId || title,
        });
        notification.onclick = () => {
          window.focus();
          if (orderId) {
            window.location.href = `/orders/${orderId}`;
          }
        };
      });
    };

    void setup();

    return () => {
      unsubscribeForeground?.();
    };
  }, [isAuthenticated, user]);

  return null;
}
