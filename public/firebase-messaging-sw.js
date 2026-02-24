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
  const { title, body } = payload.data || {};
  self.registration.showNotification(title || "Chats", {
    body: body || "New message",
    icon: "/favicon.ico",
    tag: payload.data?.conversationId || "chats",
  });
});
