"use client";

import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";

const FCM_SW_PATH = "/firebase-messaging-sw.js";

function getFirebaseConfig(): Record<string, string> | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const config = getFirebaseConfig();
  if (!config) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

function getPushUnsupportedReason(): string | null {
  if (typeof window === "undefined") return "Not in browser.";
  if (!window.isSecureContext) {
    return "Use HTTPS: open https://localhost:3000 (run npm run dev:https first).";
  }
  if (!("serviceWorker" in navigator)) return "This browser doesn't support service workers.";
  if (!("PushManager" in window)) return "This browser doesn't support push notifications.";
  if (!("Notification" in window)) return "This browser doesn't support notifications.";
  return null;
}

export async function getMessagingSafe(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const reason = getPushUnsupportedReason();
  if (reason) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}

/** Get messaging without isSupported() check - use when we want to try getToken anyway. */
function getMessagingOrThrow(): Messaging {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase not configured.");
  return getMessaging(app);
}

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Ensure the FCM service worker is registered and active (required before getToken). */
export async function getFcmServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(FCM_SW_PATH, { scope: "/" });
    await reg.update();
    const sw = reg.installing ?? reg.waiting ?? reg.active;
    if (sw && sw.state !== "activated") {
      await new Promise<void>((resolve) => {
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") resolve();
        });
        if (sw.state === "activated") resolve();
      });
    }
    return reg;
  } catch (e) {
    console.error("FCM service worker registration failed:", e);
    return null;
  }
}

export type GetFcmTokenResult = { token: string } | { error: string };

export async function getFcmToken(): Promise<GetFcmTokenResult> {
  if (!VAPID_KEY?.trim()) return { error: "Missing VAPID key. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your env." };
  const unsupportedReason = getPushUnsupportedReason();
  if (unsupportedReason) return { error: unsupportedReason };
  const swReg = await getFcmServiceWorkerRegistration();
  if (!swReg) return { error: "Could not register notification service worker. Check that /firebase-messaging-sw.js is served." };
  let messaging: Messaging;
  try {
    messaging = getMessagingOrThrow();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Firebase not configured." };
  }
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return { error: "Could not get notification token." };
    return { token };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("messaging/failed-service-worker-registration")) return { error: "Service worker failed. Reload the page and try again." };
    if (msg.includes("messaging/permission-blocked")) return { error: "Notifications are blocked." };
    if (msg.includes("indexeddb") || msg.includes("IndexedDB")) return { error: "Enable site data (cookies/storage) for this site and reload." };
    if (msg.includes("supported") || msg.includes("not supported")) return { error: "Use Chrome or Edge on desktop or Android (HTTPS). Not supported in iOS Safari or private mode." };
    return { error: msg || "Could not get notification token." };
  }
}

/** Subscribe to foreground FCM messages (when tab is open). Shows a browser notification. Returns cleanup. */
export async function subscribeToForegroundMessages(): Promise<() => void> {
  const messaging = await getMessagingSafe();
  if (!messaging) return () => {};
  const unsub = onMessage(messaging, (payload) => {
    const notif = (payload as { notification?: { title?: string; body?: string }; data?: { title?: string; body?: string } }).notification;
    const data = (payload as { data?: { title?: string; body?: string } }).data;
    const title = notif?.title ?? data?.title ?? "Chats";
    const body = notif?.body ?? data?.body ?? "New message";
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  });
  return unsub;
}
