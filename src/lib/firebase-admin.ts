import { readFileSync } from "fs";
import { resolve } from "path";
import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let adminApp: ReturnType<typeof getApp> | null = null;

function getServiceAccountJson(): string | null {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathEnv && typeof pathEnv === "string") {
    try {
      return readFileSync(resolve(process.cwd(), pathEnv), "utf8");
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_PATH read failed:", e);
    }
  }
  return null;
}

export function getFirebaseAdmin(): {
  db: ReturnType<typeof getFirestore>;
  messaging: ReturnType<typeof getMessaging>;
} | null {
  if (adminApp) {
    return { db: getFirestore(adminApp), messaging: getMessaging(adminApp) };
  }
  const serviceAccountJson = getServiceAccountJson();
  if (!serviceAccountJson) return null;
  try {
    const parsed = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    const serviceAccount = { ...parsed } as Record<string, string>;
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    adminApp = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
    return { db: getFirestore(adminApp), messaging: getMessaging(adminApp) };
  } catch (e) {
    console.error("Firebase Admin init failed:", e);
    return null;
  }
}

export { FieldValue };
