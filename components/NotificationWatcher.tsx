import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery } from '@tanstack/react-query';
import { fetchStoreBookings } from '@/app/services/bookingsApi';
import { getToken } from '@/app/services/auth';
import { useAuth } from '@/app/contexts/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Setup notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
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
}

async function triggerOrderNotification(order: any) {
  const checkoutId = order.checkoutId?.toUpperCase() || order._id?.substring(0, 8).toUpperCase();
  const userName = order.userId?.name || 'Customer';
  const total = order.itemsSubtotal || order.totalAmount || '0';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Order Received! 🛒',
      body: `Order #${checkoutId} from ${userName} for ₹${total}`,
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

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Booking Received! 📅',
      body: `Booking #${bookingId} for "${itemName}" from ${userName} for ₹${total}`,
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

  // Request permissions on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
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

  // Query for orders
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

  return null; // This component registers listeners and does background polling
}
