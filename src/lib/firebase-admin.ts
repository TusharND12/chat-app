import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let adminApp: ReturnType<typeof getApp> | null = null;

export function getFirebaseAdmin(): {
  db: ReturnType<typeof getFirestore>;
  messaging: ReturnType<typeof getMessaging>;
} | null {
  if (adminApp) {
    return { db: getFirestore(adminApp), messaging: getMessaging(adminApp) };
  }
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;
  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as Record<string, string>;
    adminApp = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
    return { db: getFirestore(adminApp), messaging: getMessaging(adminApp) };
  } catch {
    return null;
  }
}

export { FieldValue };
