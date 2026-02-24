// Firebase Cloud Messaging service worker (FCM for web push)
// Replace the config below with your Firebase project config from Firebase Console.
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyCgEuPTI2HMeGigHV569h6SH9A6yknmR0Y",
  authDomain: "my-applications-51db7.firebaseapp.com",
  projectId: "my-applications-51db7",
  storageBucket: "my-applications-51db7.firebasestorage.app",
  messagingSenderId: "1049190827221",
  appId: "1:1049190827221:web:bd1349d9976bcbebcb4e5c",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = (notif.title || data.title || "Chats").toString();
  const body = (notif.body || data.body || "New message").toString();
  const url = self.location.origin + "/chat";
  self.registration.showNotification(title, {
    body: body,
    icon: "/favicon.ico",
    tag: (data.conversationId || "chats").toString(),
    data: { url: url },
    requireInteraction: false,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin + "/chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].navigate(url);
      } else if (self.clients.openWindow) {
        self.clients.openWindow(url);
      }
    })
  );
});
