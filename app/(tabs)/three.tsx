import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
<<<<<<< HEAD
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
=======
import React, { useMemo, useState } from 'react';
>>>>>>> 46db4b634d249e8839d3783c3cfb8c85b8de648c
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  UIManager,
<<<<<<< HEAD
  View,
} from 'react-native';
import { getToken } from '../services/auth';
import {
  clearBadge,
  registerForPushNotificationsAsync,
  sendNewOrderNotification,
} from '../services/notifications'; // adjust path if needed
import { styles } from './tab_style/three.style';
=======
  View
} from 'react-native';
import { getToken } from '../services/auth';
import { styles } from '../tab_style/three.style';
>>>>>>> 46db4b634d249e8839d3783c3cfb8c85b8de648c

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const PRODUCT_STEPS = ['PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const SERVICE_STEPS = ['PLACED', 'ACCEPTED', 'DELIVERED'];

<<<<<<< HEAD
=======
// Add this below your API_BASE_URL / constant definitions
const showConfirmation = (
  title: string, 
  message: string, 
  onConfirm: () => void
) => {
  if (Platform.OS === 'web') {
    // web browsers natively support confirm blocks which returns a boolean
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    }
  } else {
    // Mobile devices use the standard React Native multi-button array
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Status Configuration - Matches your Backend Enums
>>>>>>> 46db4b634d249e8839d3783c3cfb8c85b8de648c
const STATUS_CONFIG = {
  PLACED:    { color: '#DAA520', icon: 'shopping-cart', label: 'Order Placed' },
  READY:     { color: '#FF9800', icon: 'clock-o',       label: 'Ready' },
  ACCEPTED:  { color: '#2E7D32', icon: 'check-circle',  label: 'Accepted' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle',    label: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle',  label: 'Completed' },
  CANCELLED: { color: '#D32F2F', icon: 'times-circle',  label: 'Rejected' },
};

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // ── Track previous order IDs so we can detect genuinely NEW orders ──────────
  const previousOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef<boolean>(true);
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // ── Register for push notifications on mount ─────────────────────────────────
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log('Expo Push Token:', token);
        // TODO: send `token` to your backend so the server can push remotely
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      }
    );

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const checkoutId = response.notification.request.content.data?.checkoutId;
        if (checkoutId) {
          // Auto-expand the tapped order
          setExpandedOrders((prev) => ({ ...prev, [String(checkoutId)]: true }));
          setSelectedFilter('PLACED');
        }
      }
    );

    // Clear badge when app comes to foreground
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        clearBadge();
      }
      appState.current = nextState;
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      sub.remove();
    };
  }, []);

  // ── Fetch Orders (polls every 30s) ───────────────────────────────────────────
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // ── Detect new PLACED orders and fire notification ───────────────────────────
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const currentIds = new Set<string>(orders.map((o: any) => o._id));

    if (isFirstLoad.current) {
      // On the first load, just seed the set — don't notify for existing orders
      previousOrderIds.current = currentIds;
      isFirstLoad.current = false;
      return;
    }

    // Find orders that weren't in the previous fetch
    const newOrders = orders.filter(
      (o: any) =>
        !previousOrderIds.current.has(o._id) && o.status === 'PLACED'
    );

    newOrders.forEach((order: any) => {
      sendNewOrderNotification({
        checkoutId: order.checkoutId,
        customerName: order.userId?.name || 'A customer',
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      });
    });

    previousOrderIds.current = currentIds;
  }, [orders]);

  // ── Filter Logic ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (selectedFilter === 'ALL') return orders;
    return orders.filter((o: any) => o.status === selectedFilter);
  }, [orders, selectedFilter]);

  // ── Status Update Mutation ───────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, endpoint }: { orderId: string; endpoint: string }) => {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/storekeeper/orders/${orderId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      return result;
    },
   onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showAlert('Success', 'Order status updated'); // <-- Changed to showAlert
    },
    onError: (error: any) => {
<<<<<<< HEAD
      Alert.alert('Action Failed', error.message);
    },
=======
      showAlert('Action Failed', error.message); // <-- Changed to showAlert
    }
>>>>>>> 46db4b634d249e8839d3783c3cfb8c85b8de648c
  });

  const handleAction = (orderId: string, endpoint: string, label: string) => {
    showConfirmation(
      'Confirm', 
      `Do you want to ${label}?`, 
      () => updateStatusMutation.mutate({ orderId, endpoint })
    );
  };

  const toggleExpand = (orderId: string) => {
<<<<<<< HEAD
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
=======
    // Only execute layout animations on native mobile platforms
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
>>>>>>> 46db4b634d249e8839d3783c3cfb8c85b8de648c
  };

  const renderActionButtons = (order: any) => {
    if (['DELIVERED', 'CANCELLED', 'PICKED_UP'].includes(order.status)) return null;

    const isServiceOrRent = order.items.some(
      (i: any) => i.productId?.category === 'Service' || i.productId?.category === 'Rent'
    );
    const isSelfPickup = order.paymentMethod === 'SELF_PICKUP';

    return (
      <View style={[styles.actionsContainer, { gap: 10, marginTop: 15 }]}>
        {order.status === 'PLACED' && (
          <>
            <TouchableOpacity
              style={{ flex: 2 }}
              onPress={() =>
                handleAction(
                  order._id,
                  'ready',
                  isServiceOrRent ? 'Accept' : 'Mark Ready'
                )
              }
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>
                  {isServiceOrRent ? 'ACCEPT' : 'MARK READY'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => handleAction(order._id, 'reject', 'Reject Order')}
            >
              <LinearGradient
                colors={['#F44336', '#D32F2F']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>REJECT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {(order.status === 'READY' || order.status === 'ACCEPTED') &&
          (isServiceOrRent || isSelfPickup) && (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => handleAction(order._id, 'deliver', 'Complete Order')}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>COMPLETE / DELIVER</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  const renderOrderItem = ({ item: order }: { item: any }) => {
    const isServiceOrRent = order.items.some(
      (i: any) =>
        i.productId?.category === 'Service' || i.productId?.category === 'Rent'
    );
    const steps = isServiceOrRent ? SERVICE_STEPS : PRODUCT_STEPS;
    const currentStep = steps.indexOf(order.status);
    const isExpanded = expandedOrders[order._id];
    const statusInfo =
      STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PLACED;

    return (
      <View style={styles.orderCard}>
        <LinearGradient colors={['#FFFFFF', '#FDFBF0']} style={styles.orderCardGradient}>
          {/* Header */}
          <View style={styles.orderHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdLabel}>
                REF: #{order.checkoutId?.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 10, color: '#888' }}>
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusInfo.color + '15',
                  borderColor: statusInfo.color,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Customer Info */}
          <TouchableOpacity
            onPress={() => toggleExpand(order._id)}
            style={styles.customerCard}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {order.userId?.name?.charAt(0) || '?'}
                  </Text>
                </View>
                <Text style={styles.customerNameMain}>
                  {order.userId?.name || 'Unknown'}
                </Text>
              </View>
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color="#AAA"
              />
            </View>
            {isExpanded && (
              <View style={styles.expandedDetails}>
                <Text style={styles.detailText}>
                  <FontAwesome name="phone" /> {order.deliveryAddress?.phone}
                </Text>
                <Text style={styles.detailText}>
                  <FontAwesome name="map-marker" /> {order.deliveryAddress?.street},{' '}
                  {order.deliveryAddress?.city}
                </Text>
                {order.paymentMethod === 'SELF_PICKUP' && (
                  <View
                    style={{
                      backgroundColor: '#E3F2FD',
                      padding: 5,
                      borderRadius: 4,
                      marginTop: 5,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: '#1976D2', fontWeight: 'bold' }}>
                      SELF PICKUP ORDER
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Steps Progress */}
          {order.status !== 'CANCELLED' && (
            <View style={styles.progressContainer}>
              {steps.map((step, index) => (
                <View key={step} style={{ alignItems: 'center', flex: 1 }}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          index <= currentStep ? '#DAA520' : '#E0E0E0',
                      },
                    ]}
                  >
                    {index <= currentStep && (
                      <FontAwesome name="check" size={8} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      { color: index <= currentStep ? '#DAA520' : '#999' },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Items List */}
          {order.items.map((item: any) => (
            <View key={item._id} style={styles.itemRowImproved}>
              <Image
                source={{ uri: `${S3_BASE_URL}/${item.productId?.images?.[0]}` }}
                style={styles.itemImageSmall}
                defaultSource={require('../../assets/images/icon.png')}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemNameSmall} numberOfLines={1}>
                  {item.productId?.name}
                </Text>
                <Text style={styles.itemCatSmall}>
                  Qty: {item.quantity} | {item.productId?.category}
                </Text>
              </View>
              <Text style={styles.itemPriceSmall}>₹{item.price}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
          </View>

          {renderActionButtons(order)}
        </LinearGradient>
      </View>
    );
  };

  if (isLoading && !orders) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Filter Bar */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        >
          {['ALL', 'PLACED', 'READY', 'ACCEPTED', 'DELIVERED', 'CANCELLED'].map(
            (filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 10,
                    backgroundColor: '#f5f5f5',
                  },
                  selectedFilter === filter && { backgroundColor: '#DAA520' },
                ]}
              >
                <Text
                  style={{
                    color: selectedFilter === filter ? '#fff' : '#666',
                    fontWeight: 'bold',
                    fontSize: 12,
                  }}
                >
                  {filter === 'CANCELLED' ? 'REJECTED' : filter}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#DAA520"
          />
        }
        ListEmptyComponent={
          <View style={{ marginTop: 100, alignItems: 'center' }}>
            <FontAwesome name="inbox" size={50} color="#ddd" />
            <Text style={{ color: '#999', marginTop: 10, fontSize: 16 }}>
              No orders found
            </Text>
          </View>
        }
      />
    </View>
  );
}