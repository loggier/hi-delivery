import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

export function hasFirebaseWebConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );
}

export async function getFirebaseWebMessaging() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!hasFirebaseWebConfig()) {
    return null;
  }
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export function getFirebaseWebVapidKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
}
