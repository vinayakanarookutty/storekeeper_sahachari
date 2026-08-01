// services/fcm.service.ts

import {
  getMessaging,
  requestPermission,
  AuthorizationStatus,
  getToken,
  onMessage,
  onTokenRefresh,
} from "@react-native-firebase/messaging";

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  registerFcmToken,
  RegisterFcmTokenDto,
} from "./api";

import {
  getWebFCMToken,
  setupWebFCMListener,
} from "./firebase.web";

// ======================================================
// App Type
// ======================================================

const APP_TYPE: RegisterFcmTokenDto["appType"] = "STORE";

// ======================================================
// Notification display configuration
// ======================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ======================================================
// Firebase Messaging Instance
// ======================================================

function messagingInstance() {
  return getMessaging();
}

// ======================================================
// Platform Mapper
// ======================================================

function getPlatform(): RegisterFcmTokenDto["platform"] {
  switch (Platform.OS) {
    case "android":
      return "ANDROID";

    case "ios":
      return "IOS";

    default:
      return "WEB";
  }
}

// ======================================================
// Request Permission
// ======================================================

export async function requestAppNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      const permission =
        await Notification.requestPermission();

      return permission === "granted";
    }

    const authStatus =
      await requestPermission(
        messagingInstance(),
      );

    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn(
        "FCM permission denied",
      );

      return false;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "orders_channel",
        {
          name: "Order Updates",
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
        },
      );
    }

    return true;
  } catch (error) {
    console.error(error);

    return false;
  }
}

// ======================================================
// Register Token
// ======================================================

export async function getFCMToken() {
  try {
    let token: string | null = null;

    if (Platform.OS === "web") {
      token = await getWebFCMToken();
    } else {
      token = await getToken(
        messagingInstance(),
      );
    }

    if (!token) {
      return null;
    }

    const payload: RegisterFcmTokenDto = {
      token,
      appType: APP_TYPE,
      platform: getPlatform(),
    };

    console.log(
      "FCM TOKEN:",
      payload,
    );

    await registerFcmToken(payload);

    return payload;
  } catch (error) {
    console.error(
      "FCM token error:",
      error,
    );

    return null;
  }
}

// ======================================================
// Foreground Listener
// ======================================================

export function setupFCMListener() {
  if (Platform.OS === "web") {
    setupWebFCMListener();

    return () => {};
  }

  return onMessage(
    messagingInstance(),
    async remoteMessage => {
      console.log(
        "FOREGROUND MESSAGE:",
        remoteMessage,
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            remoteMessage.notification?.title ??
            "Notification",

          body:
            remoteMessage.notification?.body ??
            "",

          data:
            remoteMessage.data ?? {},
        },

        trigger: null,
      });
    },
  );
}

// ======================================================
// Token Refresh
// ======================================================

export function setupFCMTokenRefresh() {
  if (Platform.OS === "web") {
    return () => {};
  }

  return onTokenRefresh(
    messagingInstance(),
    async newToken => {
      const payload: RegisterFcmTokenDto = {
        token: newToken,
        appType: APP_TYPE,
        platform: getPlatform(),
      };

      try {
        await registerFcmToken(payload);

        console.log(
          "FCM TOKEN UPDATED",
          payload,
        );
      } catch (error) {
        console.error(
          "Failed to update FCM token",
          error,
        );
      }
    },
  );
}