import fs from 'fs';
import path from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function resolveServiceAccountPath() {
  const configuredPath =
    process.env.FIREBASE_ADMIN_CREDENTIALS_PATH ||
    'firebase-admin-credentials.json';

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function loadServiceAccount(): FirebaseServiceAccount {
  const credentialsPath = resolveServiceAccountPath();
  const raw = fs.readFileSync(credentialsPath, 'utf8');
  return JSON.parse(raw) as FirebaseServiceAccount;
}

export function getFirebaseAdminMessaging() {
  if (!getApps().length) {
    const serviceAccount = loadServiceAccount();
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });
  }

  return getMessaging();
}
