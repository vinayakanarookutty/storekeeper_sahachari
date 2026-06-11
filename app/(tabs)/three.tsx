import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { getToken } from '../services/auth';
<<<<<<< HEAD
import {
  clearBadge,
  registerForPushNotificationsAsync,
  sendNewOrderNotification,
} from '../services/notifications'; // adjust path if needed
import { styles } from '../tab_style/three.style';
=======
import { screenStyles } from '../tab_style/three.style';
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

<<<<<<< HEAD
const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
=======
const S3_BASE_URL = process.env.EXEXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const PRODUCT_STEPS = ['PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const SERVICE_STEPS = ['PLACED', 'ACCEPTED', 'DELIVERED'];

// Map structural workflow steps to specific visual icons
const STEP_ICON_CONFIG: Record<string, { icon: string; label: string }> = {
  PLACED: { icon: 'shopping-cart', label: 'Placed' },
  READY: { icon: 'clock-o', label: 'Ready' },
  ACCEPTED: { icon: 'thumbs-up', label: 'Accepted' },
  PICKED_UP: { icon: 'motorcycle', label: 'Picked Up' },
  DELIVERED: { icon: 'check-circle', label: 'Delivered' },
};

// Global mapping for all backend enum states (combining badge styling and icon assets)
const STATUS_CONFIG = {
  PLACED: { color: '#DAA520', icon: 'shopping-cart', label: 'Order Placed' },
  READY: { color: '#FF9800', icon: 'clock-o', label: 'Ready' },
  ACCEPTED: { color: '#2E7D32', icon: 'check-circle', label: 'Accepted' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle', label: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle', label: 'Completed' },
  REJECTED: { color: '#D32F2F', icon: 'times-circle', label: 'Rejected' }, 
  FAILED: { color: '#757575', icon: 'exclamation-triangle', label: 'Failed' },
  CANCEL_PENDING: { color: '#E65100', icon: 'exclamation-circle', label: 'Cancel Requested' },
  CANCELLED: { color: '#D32F2F', icon: 'ban', label: 'Cancelled' },
};

const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) onConfirm();
  } else {
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

<<<<<<< HEAD
// Status Configuration - Matches your Backend Enums
const STATUS_CONFIG = {
  PLACED:    { color: '#DAA520', icon: 'shopping-cart', label: 'Order Placed' },
  READY:     { color: '#FF9800', icon: 'clock-o',       label: 'Ready' },
  ACCEPTED:  { color: '#2E7D32', icon: 'check-circle',  label: 'Accepted' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle',    label: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle',  label: 'Completed' },
  CANCELLED: { color: '#D32F2F', icon: 'times-circle',  label: 'Rejected' },
};

=======
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

<<<<<<< HEAD
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
=======
  // 1. Fetch Orders with Auto-Polling
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
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
<<<<<<< HEAD
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
=======
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showAlert('Success', 'Order status updated');
    },
    onError: (error: any) => {
      showAlert('Action Failed', error.message);
    }
  });

  const handleAction = (orderId: string, endpoint: string, label: string) => {
    showConfirmation(
      'Confirm', 
      `Do you want to ${label}?`, 
      () => updateStatusMutation.mutate({ orderId, endpoint })
    );
  };

  const toggleExpand = (orderId: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const renderActionButtons = (order: any) => {
<<<<<<< HEAD
    if (['DELIVERED', 'CANCELLED', 'PICKED_UP'].includes(order.status)) return null;
=======
    if (['DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED', 'PICKED_UP', 'CANCEL_PENDING'].includes(order.status)) return null;
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586

    const isServiceOrRent = order.items.some(
      (i: any) => i.productId?.category === 'Service' || i.productId?.category === 'Rent'
    );
    const isSelfPickup = order.paymentMethod === 'SELF_PICKUP';

    return (
      <View style={screenStyles.actionsContainer}>
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
<<<<<<< HEAD
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>
                  {isServiceOrRent ? 'ACCEPT' : 'MARK READY'}
                </Text>
=======
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>{isServiceOrRent ? 'ACCEPT' : 'MARK READY'}</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => handleAction(order._id, 'reject', 'Reject Order')}
            >
<<<<<<< HEAD
              <LinearGradient
                colors={['#F44336', '#D32F2F']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>REJECT</Text>
=======
              <LinearGradient colors={['#F44336', '#D32F2F']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>REJECT</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

<<<<<<< HEAD
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
=======
        {(order.status === 'READY' || order.status === 'ACCEPTED') && (isServiceOrRent || isSelfPickup) && (
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(order._id, 'deliver', 'Complete Order')}
            >
              <LinearGradient colors={['#2196F3', '#1976D2']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>COMPLETE / DELIVER</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
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
<<<<<<< HEAD
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
=======
    const statusInfo = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PLACED;
    
    const showCancelIndicator = order.status === 'CANCEL_PENDING' || order.status === 'CANCELLED';

    return (
      <View style={screenStyles.orderCard}>
        <LinearGradient colors={['#FFFFFF', '#FDFBF0']} style={screenStyles.orderCardGradient}>
          
          {/* Header */}
          <View style={screenStyles.orderHeader}>
            <View style={screenStyles.headerLeftRef}>
              {showCancelIndicator && (
                <FontAwesome 
                  name={statusInfo.icon as any} 
                  size={16} 
                  color={statusInfo.color} 
                />
              )}
              <Text style={screenStyles.orderIdLabel}>REF: #{order.checkoutId?.toUpperCase()}</Text>
            </View>
            
            {/* Dynamic Status Badge displaying both an explicit status Icon + Text label */}
            <View style={[screenStyles.statusBadge, { backgroundColor: statusInfo.color + '12', borderColor: statusInfo.color }]}>
              <FontAwesome name={statusInfo.icon as any} size={11} color={statusInfo.color} />
              <Text style={[screenStyles.statusBadgeText, { color: statusInfo.color }]}>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
                {statusInfo.label}
              </Text>
            </View>
          </View>

<<<<<<< HEAD
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
=======
          <Text style={screenStyles.dateText}>
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>

          {/* Customer Info Card */}
          <TouchableOpacity onPress={() => toggleExpand(order._id)} style={screenStyles.customerCard}>
            <View style={screenStyles.customerRow}>
                <View style={screenStyles.customerMainLeft}>
                  <View style={screenStyles.avatarCircle}>
                    <Text style={screenStyles.avatarText}>{order.userId?.name?.charAt(0) || '?'}</Text>
                  </View>
                  <Text style={screenStyles.customerNameMain}>{order.userId?.name || 'Unknown'}</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
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
<<<<<<< HEAD
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
=======
              <View style={screenStyles.expandedDetails}>
                <Text style={screenStyles.detailText}><FontAwesome name="phone" /> {order.deliveryAddress?.phone}</Text>
                <Text style={screenStyles.detailText}><FontAwesome name="map-marker" /> {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</Text>
                {order.paymentMethod === 'SELF_PICKUP' && (
                  <View style={screenStyles.selfPickupBadge}>
                    <Text style={screenStyles.selfPickupText}>SELF PICKUP ORDER</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

<<<<<<< HEAD
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
=======
          {/* Steps Progress Tracker - Using functional Workflow Tracking Icons */}
          {!['CANCELLED', 'CANCEL_PENDING', 'REJECTED', 'FAILED'].includes(order.status) && (
            <View style={screenStyles.progressContainer}>
              {steps.map((step, index) => {
                const isCompletedOrCurrent = index <= currentStep;
                const stepMeta = STEP_ICON_CONFIG[step] || { icon: 'circle', label: step };
                return (
                  <View key={step} style={screenStyles.stepBlock}>
                    <View style={[screenStyles.progressIconCircle, { backgroundColor: isCompletedOrCurrent ? '#DAA520' : '#E0E0E0' }]}>
                      <FontAwesome name={stepMeta.icon as any} size={11} color={isCompletedOrCurrent ? '#fff' : '#999'} />
                    </View>
                    <Text style={[screenStyles.progressText, { color: isCompletedOrCurrent ? '#DAA520' : '#999' }]}>
                      {stepMeta.label}
                    </Text>
                  </View>
                );
              })}
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
            </View>
          )}

          {/* Items List */}
          {order.items.map((item: any) => (
<<<<<<< HEAD
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
=======
            <View key={item._id} style={screenStyles.itemRowImproved}>
              <Image 
                source={{ uri: `${S3_BASE_URL}/${item.productId?.images?.[0]}` }} 
                style={screenStyles.itemImageSmall} 
                defaultSource={require('../../assets/images/icon.png')} 
              />
              <View style={screenStyles.itemInfo}>
                <Text style={screenStyles.itemNameSmall} numberOfLines={1}>{item.productId?.name}</Text>
                <Text style={screenStyles.itemCatSmall}>Qty: {item.quantity} | {item.productId?.category}</Text>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
              </View>
              <Text style={screenStyles.itemPriceSmall}>₹{item.price}</Text>
            </View>
          ))}

          <View style={screenStyles.totalRow}>
            <Text style={screenStyles.totalLabel}>Grand Total</Text>
            <Text style={screenStyles.totalValue}>₹{order.itemsSubtotal}</Text>
          </View>

          {renderActionButtons(order)}
        </LinearGradient>
      </View>
    );
  };

  if (isLoading && !orders) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <StatusBar barStyle="dark-content" />
<<<<<<< HEAD

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
=======
      
      {/* Scrollable Filter View */}
      <View style={screenStyles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['ALL', 'PLACED', 'READY', 'ACCEPTED', 'DELIVERED', 'CANCEL_PENDING', 'CANCELLED', 'REJECTED'].map((filter) => (
             <TouchableOpacity 
               key={filter}
               onPress={() => setSelectedFilter(filter)}
               style={[
                   screenStyles.filterTabButton,
                   selectedFilter === filter && { backgroundColor: '#DAA520' }
               ]}
             >
               <Text style={[screenStyles.filterTabText, { color: selectedFilter === filter ? '#fff' : '#666' }]}>
                   {filter === 'CANCEL_PENDING' ? 'CANCEL REQ.' : filter}
               </Text>
             </TouchableOpacity>
          ))}
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
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
<<<<<<< HEAD
          <View style={{ marginTop: 100, alignItems: 'center' }}>
            <FontAwesome name="inbox" size={50} color="#ddd" />
            <Text style={{ color: '#999', marginTop: 10, fontSize: 16 }}>
              No orders found
            </Text>
          </View>
=======
            <View style={screenStyles.emptyContainer}>
                <FontAwesome name="inbox" size={50} color="#ddd" />
                <Text style={screenStyles.emptyText}>No orders found</Text>
            </View>
>>>>>>> 236a8d2d2f496262cb08d7e58a3e637c0d664586
        }
      />
    </View>
  );
}