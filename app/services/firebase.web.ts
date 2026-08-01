// services/fcm.web.ts

import { initializeApp, getApps } from "firebase/app";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

import * as Notifications from "expo-notifications";
const firebaseConfig = {
  apiKey: "AIzaSyBR4BFQmXwMuTGkQBH6dGYDNP-nCbo9mgw",
  authDomain: "sahachari-32fca.firebaseapp.com",
  projectId: "sahachari-32fca",
  storageBucket: "sahachari-32fca.firebasestorage.app",
  messagingSenderId: "208738624417",
  appId: "1:208738624417:web:7ce0942d495761c31ca1e0",
  measurementId: "G-GMGZV524TE"
};
const VAPID_KEY = "BPF6KEDj9sEStqVKYQSRQG3XdtCzfVr-_tB-4xYSr3vOXxG0tvaXpP0eR5H7UHvAjSFVf9AKHxWbKPytpB8nxjE";
//
// Firebase App
//

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

//
// Register Service Worker
//

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "Service Workers are not supported.",
    );
  }

  return await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
}

//
// Get Web FCM Token
//

export async function getWebFCMToken() {
  try {
    const supported =
      await isSupported();

    if (!supported) {
      console.warn(
        "Firebase Messaging is not supported.",
      );

      return null;
    }

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn(
        "Notification permission denied.",
      );

      return null;
    }

    const registration =
      await registerServiceWorker();

    const messaging =
      getMessaging(app);

    const token =
      await getToken(
        messaging,
        {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration:
            registration,
        },
      );

    console.log(
      "WEB FCM TOKEN:",
      token,
    );

    return token;
  } catch (error) {
    console.error(
      "Failed getting Web FCM token:",
      error,
    );

    return null;
  }
}

//
// Foreground Notifications
//

export async function setupWebFCMListener() {
  const supported =
    await isSupported();

  if (!supported) {
    return;
  }

  const messaging =
    getMessaging(app);

  onMessage(
    messaging,
    async payload => {
      console.log(
        "WEB FOREGROUND MESSAGE:",
        payload,
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            payload.notification?.title ??
            "Notification",

          body:
            payload.notification?.body ??
            "",

          data:
            payload.data ?? {},
        },

        trigger: null,
      });
    },
  );
}