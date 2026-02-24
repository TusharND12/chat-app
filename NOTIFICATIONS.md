# Push Notifications (FCM)

This app uses **Firebase Cloud Messaging (FCM)** for push notifications on **web (desktop + mobile)** and **Android** (when using the site in Chrome or as PWA).

## Setup

### 1. Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com) and create or select a project.
2. Add a **Web app** and copy the config.
3. Enable **Cloud Messaging** (Project settings → Cloud Messaging). Create a **Web Push certificate** (VAPID key) under Cloud Messaging.

### 2. Environment variables

**Client (Next.js):**

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (optional, defaults to `{projectId}.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Web Push certificate key from Firebase Console)

**Server (Vercel / API routes):**

- `FIREBASE_SERVICE_ACCOUNT_JSON` – JSON string of your Firebase service account key (Project settings → Service accounts → Generate new private key). Used for Firestore (token storage) and sending FCM messages.

### 3. Service worker config

Edit `public/firebase-messaging-sw.js` and replace the placeholder `firebaseConfig` with your Firebase web app config (same values as in your env).

### 4. Firestore

1. In Firebase Console, enable **Firestore**.
2. Create a collection `fcm_tokens`. Documents are keyed by Convex user ID; each document has a `tokens` array (FCM registration tokens) and `updatedAt`.
3. (Optional) Restrict access with security rules; the app uses the Admin SDK from the API route to read/write.

## Flow

- **Registration:** On load (when authenticated), the client requests notification permission, gets an FCM token, saves it in Convex and calls `POST /api/notifications/register` to store it in Firestore.
- **Sending:** When a user sends a message, the client calls `POST /api/notifications/send` with the other participants’ user IDs; the API reads their tokens from Firestore and sends the notification via FCM.

## Android

Use the same web app in Chrome or add the site as a **PWA** (e.g. “Add to Home screen”). The same FCM web flow applies; no native Android app is required.
