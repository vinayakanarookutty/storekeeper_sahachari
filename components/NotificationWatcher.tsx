import React, { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
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

async function registerForPushNotificationsAsync(authToken?: string | null) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }
    return;
  }

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

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('NotificationWatcher: Failed to get notification permission!');
    return;
  }

  // Fetch FCM / Push token and register with Sahachari Backend
  try {
    let tokenString: string | null = null;
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      tokenString = deviceTokenData.data;
    } catch {
      const expoTokenData = await Notifications.getExpoPushTokenAsync();
      tokenString = expoTokenData.data;
    }

    if (tokenString && authToken) {
      console.log('NotificationWatcher: Registering FCM Token with backend...', tokenString.substring(0, 15));
      const response = await fetch(`${API_BASE_URL}/users/fcm-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcmToken: tokenString }),
      });
      if (response.ok) {
        console.log('NotificationWatcher: FCM token registered successfully with backend!');
      } else {
        console.warn('NotificationWatcher: Failed to register FCM token. Status:', response.status);
      }
    }
  } catch (tokenErr) {
    console.warn('NotificationWatcher: Error getting device token:', tokenErr);
  }
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

  // Listen for incoming FCM push notifications in foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('NotificationWatcher: Push notification received:', notification.request.content.title);
      playAlert();
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('NotificationWatcher: User tapped notification:', response.notification.request.content.data);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

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
