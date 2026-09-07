import React, { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import {
  getMessaging,
  getToken as getFcmToken,
  registerDeviceForRemoteMessages,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  RemoteMessage,
} from '@react-native-firebase/messaging';
import { useQuery } from '@tanstack/react-query';
import { fetchStoreBookings } from '@/app/services/bookingsApi';
import { getToken } from '@/app/services/auth';
import { useAuth } from '@/app/contexts/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Setup notification handler behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function sendTokenToBackend(tokenString: string, authToken?: string | null) {
  if (!tokenString || !authToken) return;

  const platform = Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
  
  try {
    console.log(`NotificationWatcher: Registering FCM Token (${platform}) with backend...`, tokenString.substring(0, 15));
    const response = await fetch(`${API_BASE_URL}/users/fcm-token`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: tokenString,
        fcmToken: tokenString,
        appType: 'STORE',
        platform: platform,
      }),
    });

    if (response.ok) {
      console.log('NotificationWatcher: FCM token registered successfully with backend!');
    } else {
      console.warn('NotificationWatcher: Failed to register FCM token. Status:', response.status);
    }
  } catch (err) {
    console.warn('NotificationWatcher: Error registering FCM token with backend:', err);
  }
}

async function registerForPushNotificationsAsync(authToken?: string | null): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }
    return null;
  }

  let tokenString: string | null = null;

  // 1. Android Notification Channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders_channel', {
      name: 'Order Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000],
      lightColor: '#DAA520',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DAA520',
    });
  }

  // 2. Request Permissions via expo-notifications (standard for Expo iOS/Android)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('NotificationWatcher: Notification permission not granted.');
  }

  // 3. Obtain Firebase Cloud Messaging (FCM) Token using modular API
  try {
    const messagingInstance = getMessaging();
    if (Platform.OS === 'ios') {
      if (!isDeviceRegisteredForRemoteMessages(messagingInstance)) {
        await registerDeviceForRemoteMessages(messagingInstance);
      }
    }
    tokenString = await getFcmToken(messagingInstance);
  } catch (firebaseErr) {
    console.warn('NotificationWatcher: Firebase messaging getToken error (falling back to device push token):', firebaseErr);
  }

  // 4. Fallback if Firebase Messaging token was not obtained (e.g. Expo Go / local dev)
  if (!tokenString) {
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      tokenString = typeof deviceTokenData.data === 'string' ? deviceTokenData.data : JSON.stringify(deviceTokenData.data);
    } catch {
      try {
        const expoTokenData = await Notifications.getExpoPushTokenAsync();
        tokenString = expoTokenData.data;
      } catch (err) {
        console.warn('NotificationWatcher: Failed to obtain push token:', err);
      }
    }
  }

  // 5. Send Token to Backend
  if (tokenString && authToken) {
    await sendTokenToBackend(tokenString, authToken);
  }

  return tokenString;
}

async function playAlert() {
  try {
    if (Platform.OS !== 'web') {
      // Vibrate: start immediately, vibrate 1s, pause 0.5s, vibrate 1s, pause 0.5s, vibrate 1s
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], false);

      // Configure audio session to play sound even in silent mode if necessary
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      // Load and play notification sound
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/notification.wav')
      );
      await sound.playAsync();

      // Automatically unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    }
  } catch (error) {
    console.warn('NotificationWatcher: Error playing alert sound/vibration:', error);
  }
}

async function triggerOrderNotification(order: any) {
  const checkoutId = order.checkoutId?.toUpperCase() || order._id?.substring(0, 8).toUpperCase();
  const userName = order.userId?.name || 'Customer';
  const total = order.itemsSubtotal || order.totalAmount || '0';
  const title = 'New Order Received! 🛒';
  const body = `Order #${checkoutId} from ${userName} for ₹${total}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { orderId: order._id, type: 'order' },
    },
    trigger: null, // immediate
  });
}

async function triggerBookingNotification(booking: any) {
  const bookingId = booking._id?.substring(0, 8).toUpperCase();
  const userName = booking.userId?.name || 'Customer';
  const itemName = booking.item?.itemName || 'Listing';
  const total = booking.totalAmount || '0';
  const title = 'New Booking Received! 📅';
  const body = `Booking #${bookingId} for "${itemName}" from ${userName} for ₹${total}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { bookingId: booking._id, type: 'booking' },
    },
    trigger: null, // immediate
  });
}

export default function NotificationWatcher() {
  const { token } = useAuth();
  
  const seenOrderIds = useRef<Set<string>>(new Set());
  const seenBookingIds = useRef<Set<string>>(new Set());
  const isFirstOrdersFetch = useRef<boolean>(true);
  const isFirstBookingsFetch = useRef<boolean>(true);

  // Request permissions and sync FCM token on mount / auth token change
  useEffect(() => {
    registerForPushNotificationsAsync(token);
  }, [token]);

  // Listen for incoming FCM & Expo push notifications in foreground and token refresh
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // 1. Expo Notification foreground listener
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('NotificationWatcher: Expo notification received:', notification.request.content.title);
      playAlert();
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('NotificationWatcher: User tapped Expo notification:', response.notification.request.content.data);
    });

    // 2. Firebase Messaging foreground listener
    let unsubscribeFcmMessage: (() => void) | undefined;
    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeFcmOpened: (() => void) | undefined;

    try {
      const messagingInstance = getMessaging();
      unsubscribeFcmMessage = onMessage(messagingInstance, async (remoteMessage: RemoteMessage) => {
        console.log('NotificationWatcher: Firebase FCM foreground message received:', remoteMessage.notification?.title);
        playAlert();
      });

      unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async (refreshedToken: string) => {
        console.log('NotificationWatcher: FCM Token refreshed:', refreshedToken.substring(0, 15));
        await sendTokenToBackend(refreshedToken, token);
      });

      unsubscribeFcmOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage: RemoteMessage) => {
        console.log('NotificationWatcher: App opened from background via FCM:', remoteMessage.data);
      });

      getInitialNotification(messagingInstance).then((remoteMessage: RemoteMessage | null) => {
        if (remoteMessage) {
          console.log('NotificationWatcher: App opened from quit state via FCM:', remoteMessage.data);
        }
      });
    } catch (err) {
      console.warn('NotificationWatcher: Failed to attach FCM listeners:', err);
    }

    return () => {
      notificationListener.remove();
      responseListener.remove();
      if (unsubscribeFcmMessage) unsubscribeFcmMessage();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
      if (unsubscribeFcmOpened) unsubscribeFcmOpened();
    };
  }, [token]);

  // Reset tracking state if token changes/clears (logout scenario)
  useEffect(() => {
    if (!token) {
      seenOrderIds.current.clear();
      seenBookingIds.current.clear();
      isFirstOrdersFetch.current = true;
      isFirstBookingsFetch.current = true;
      console.log('NotificationWatcher: Token cleared, state reset');
    }
  }, [token]);

  // Query for orders (Background Sync)
  const { data: orders } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 30000,
    enabled: !!token,
  });

  // Query for bookings
  const { data: bookings } = useQuery<any[]>({
    queryKey: ['storeBookingsList'],
    queryFn: async () => {
      return await fetchStoreBookings();
    },
    refetchInterval: 30000,
    enabled: !!token,
  });

  // Monitor Orders
  useEffect(() => {
    if (!orders || !Array.isArray(orders)) return;

    if (isFirstOrdersFetch.current) {
      orders.forEach((order: any) => {
        if (order._id) seenOrderIds.current.add(order._id);
      });
      isFirstOrdersFetch.current = false;
      console.log('NotificationWatcher: Initialized seen orders count:', seenOrderIds.current.size);
      return;
    }

    orders.forEach((order: any) => {
      if (order._id && !seenOrderIds.current.has(order._id)) {
        seenOrderIds.current.add(order._id);
        if (order.status === 'PLACED') {
          triggerOrderNotification(order);
          playAlert();
        }
      }
    });
  }, [orders]);

  // Monitor Bookings
  useEffect(() => {
    if (!bookings || !Array.isArray(bookings)) return;

    if (isFirstBookingsFetch.current) {
      bookings.forEach((booking: any) => {
        if (booking._id) seenBookingIds.current.add(booking._id);
      });
      isFirstBookingsFetch.current = false;
      console.log('NotificationWatcher: Initialized seen bookings count:', seenBookingIds.current.size);
      return;
    }

    bookings.forEach((booking: any) => {
      if (booking._id && !seenBookingIds.current.has(booking._id)) {
        seenBookingIds.current.add(booking._id);
        if (booking.status === 'PLACED') {
          triggerBookingNotification(booking);
        }
      }
    });
  }, [bookings]);

  return null; // This component registers listeners and manages FCM push notifications
}
