import { NextResponse } from 'next/server';

function requiredEnv(name: string) {
  return process.env[name] ?? '';
}

export async function GET() {
  const serviceWorkerSource = `
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'))},
  authDomain: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'))},
  projectId: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'))},
  storageBucket: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'))},
  messagingSenderId: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'))},
  appId: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_APP_ID'))},
  measurementId: ${JSON.stringify(requiredEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'))},
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || payload.data?.title || 'Hi Delivery';
  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      'Tienes una actualización nueva.',
    icon: '/logo-hid.png',
    data: {
      orderId: payload.data?.orderId,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const targetUrl = orderId ? \`/orders/\${orderId}\` : '/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
`;

  return new NextResponse(serviceWorkerSource, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
