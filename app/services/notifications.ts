import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── 1. Configure how notifications appear when app is FOREGROUND ───────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show banner even when app is open
    shouldPlaySound: true,   // play sound
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── 2. Request Permission & get Push Token ─────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Android channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'New Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'order_alert.wav',   // place this file in /assets/sounds/
      lightColor: '#DAA520',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  // Get Expo push token (for remote/server-sent notifications)
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

// ─── 3. Send a LOCAL notification immediately (triggered from your app) ──────
export async function sendNewOrderNotification(order: {
  checkoutId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🛒 New Order Received!',
      body: `${order.customerName} placed an order for ₹${order.totalAmount} (${order.itemCount} item${order.itemCount > 1 ? 's' : ''})`,
      data: { checkoutId: order.checkoutId },
      sound: 'order_alert.wav',  // Android uses channel sound; iOS uses this
      badge: 1,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // null = fire immediately
  });
}

// ─── 4. Clear badge count (call on app focus) ────────────────────────────────
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}