import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  View
} from 'react-native';
import { getToken } from '../services/auth';
import { screenStyles } from '../tab_style/three.style';
import { useLanguage } from '../contexts/LanguageContext'; // IMPORT LANGUAGE CONTEXT

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const S3_BASE_URL = process.env.EXEXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const PRODUCT_STEPS = ['PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const SERVICE_STEPS = ['PLACED', 'ACCEPTED', 'DELIVERED'];

// Structural configurations mapping keys to structural assets
const STEP_ICON_CONFIG: Record<string, { icon: string; translationKey: string; defaultLabel: string }> = {
  PLACED: { icon: 'shopping-cart', translationKey: 'ready', defaultLabel: 'Placed' },
  READY: { icon: 'clock-o', translationKey: 'statusReady', defaultLabel: 'Ready' },
  ACCEPTED: { icon: 'thumbs-up', translationKey: 'statusAccepted', defaultLabel: 'Accepted' },
  PICKED_UP: { icon: 'motorcycle', translationKey: 'statusPickedUp', defaultLabel: 'Picked Up' },
  DELIVERED: { icon: 'check-circle', translationKey: 'delivered', defaultLabel: 'Delivered' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: string; translationKey: string; defaultLabel: string }> = {
  PLACED: { color: '#DAA520', icon: 'shopping-cart', translationKey: 'statusPlaced', defaultLabel: 'Order Placed' },
  READY: { color: '#FF9800', icon: 'clock-o', translationKey: 'statusReady', defaultLabel: 'Ready' },
  ACCEPTED: { color: '#2E7D32', icon: 'check-circle', translationKey: 'statusAccepted', defaultLabel: 'Accepted' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle', translationKey: 'statusPickedUp', defaultLabel: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle', translationKey: 'statusCompleted', defaultLabel: 'Completed' },
  REJECTED: { color: '#D32F2F', icon: 'times-circle', translationKey: 'statusRejected', defaultLabel: 'Rejected' }, 
  FAILED: { color: '#757575', icon: 'exclamation-triangle', translationKey: 'statusFailed', defaultLabel: 'Failed' },
  CANCEL_PENDING: { color: '#E65100', icon: 'exclamation-circle', translationKey: 'cancelRequestedLabel', defaultLabel: 'Cancel Requested' },
  CANCELLED: { color: '#D32F2F', icon: 'ban', translationKey: 'statusCancelled', defaultLabel: 'Cancelled' }, // FIX: Linked to statusCancelled
};

export default function OrdersScreen() {
  const { t } = useLanguage(); // ACCESS DICTIONARY OBJECT
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Native Platform Helper Alerts
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { text: t.confirmTitle || 'Confirm', onPress: onConfirm },
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

  // 1. Fetch Orders with Auto-Polling
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(t.noOrdersFound || 'Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 30000, 
  });

  // 2. Filter Logic (FIXED to separate user/admin structural rejections from cancellations)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (selectedFilter === 'ALL') return orders;

    return orders.filter((o: any) => {
      const orderStatus = o.status?.toUpperCase();
      const cancellationSource = o.cancelledBy?.toLowerCase() || '';

      if (selectedFilter === 'REJECTED') {
        return (
          orderStatus === 'REJECTED' ||
          (orderStatus === 'CANCELLED' && (cancellationSource === 'user' || cancellationSource === 'admin' || cancellationSource === 'superadmin'))
        );
      }

      if (selectedFilter === 'CANCELLED') {
        return orderStatus === 'CANCELLED' && cancellationSource !== 'user' && cancellationSource !== 'admin' && cancellationSource !== 'superadmin';
      }

      return o.status === selectedFilter;
    });
  }, [orders, selectedFilter]);

  // 3. Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, endpoint }: { orderId: string; endpoint: string }) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showAlert(t.successTitle || 'Success', t.statusUpdatedSuccess || 'Order status updated');
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Action Failed', error.message);
    }
  });

  const handleAction = (orderId: string, endpoint: string, confirmationMsg: string) => {
    showConfirmation(
      t.confirmTitle || 'Confirm', 
      confirmationMsg, 
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
    if (['DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED', 'PICKED_UP', 'CANCEL_PENDING'].includes(order.status)) return null;

    const isServiceOrRent = order.items.some((i: any) => 
        i.productId?.category === 'Service' || i.productId?.category === 'Rent'
    );
    const isSelfPickup = order.paymentMethod === 'SELF_PICKUP';

    return (
      <View style={screenStyles.actionsContainer}>
        {order.status === 'PLACED' && (
          <>
            <TouchableOpacity 
              style={{ flex: 2 }} 
              onPress={() => handleAction(
                order._id, 
                'ready', 
                isServiceOrRent ? (t.confirmAcceptOrder || 'Do you want to Accept this order?') : (t.confirmMarkReady || 'Do you want to Mark this order Ready?')
              )}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>
                  {isServiceOrRent ? (t.accept || 'ACCEPT') : (t.markReady || 'MARK READY')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(order._id, 'reject', t.confirmRejectOrder || 'Do you want to Reject this Order?')}
            >
              <LinearGradient colors={['#F44336', '#D32F2F']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>{t.reject || 'REJECT'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {(order.status === 'READY' || order.status === 'ACCEPTED') && (isServiceOrRent || isSelfPickup) && (
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(order._id, 'deliver', t.confirmCompleteOrder || 'Do you want to Complete this Order?')}
            >
              <LinearGradient colors={['#2196F3', '#1976D2']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>{t.completeDeliver || 'COMPLETE / DELIVER'}</Text>
              </LinearGradient>
            </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderOrderItem = ({ item: order }: { item: any }) => {
    const isServiceOrRent = order.items.some((i: any) => i.productId?.category === 'Service' || i.productId?.category === 'Rent');
    const steps = isServiceOrRent ? SERVICE_STEPS : PRODUCT_STEPS;
    const currentStep = steps.indexOf(order.status);
    const isExpanded = expandedOrders[order._id];
    
    // UI Visual status fallback routing logic
    let displayStatus = order.status;
    if (order.status === 'CANCELLED' && (order.cancelledBy === 'user' || order.cancelledBy === 'admin' || order.cancelledBy === 'superadmin')) {
      displayStatus = 'REJECTED';
    }
    const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.PLACED;
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
                  优质
                />
              )}
              <Text style={screenStyles.orderIdLabel}>
                {(t.refLabel || 'REF')}: #{order.checkoutId?.toUpperCase()}
              </Text>
            </View>
            
            {/* Localized Status Badge */}
            <View style={[screenStyles.statusBadge, { backgroundColor: statusInfo.color + '12', borderColor: statusInfo.color }]}>
              <FontAwesome name={statusInfo.icon as any} size={11} color={statusInfo.color} />
              <Text style={[screenStyles.statusBadgeText, { color: statusInfo.color }]}>
                {(t as any)[statusInfo.translationKey] || statusInfo.defaultLabel}
              </Text>
            </View>
          </View>

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
                  <Text style={screenStyles.customerNameMain}>{order.userId?.name || (t.unknownUser || 'Unknown')}</Text>
                </View>
                <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color="#AAA" />
            </View>
            {isExpanded && (
              <View style={screenStyles.expandedDetails}>
                <Text style={screenStyles.detailText}><FontAwesome name="phone" /> {order.deliveryAddress?.phone}</Text>
                <Text style={screenStyles.detailText}><FontAwesome name="map-marker" /> {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</Text>
                {order.paymentMethod === 'SELF_PICKUP' && (
                  <View style={screenStyles.selfPickupBadge}>
                    <Text style={screenStyles.selfPickupText}>{(t.selfPickupBadge || 'SELF PICKUP ORDER')}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Workflow Steps Progress Tracker */}
          {!['CANCELLED', 'CANCEL_PENDING', 'REJECTED', 'FAILED'].includes(order.status) && (
            <View style={screenStyles.progressContainer}>
              {steps.map((step, index) => {
                const isCompletedOrCurrent = index <= currentStep;
                const stepMeta = STEP_ICON_CONFIG[step] || { icon: 'circle', translationKey: step, defaultLabel: step };
                return (
                  <View key={step} style={screenStyles.stepBlock}>
                    <View style={[screenStyles.progressIconCircle, { backgroundColor: isCompletedOrCurrent ? '#DAA520' : '#E0E0E0' }]}>
                      <FontAwesome name={stepMeta.icon as any} size={11} color={isCompletedOrCurrent ? '#fff' : '#999'} />
                    </View>
                    <Text style={[screenStyles.progressText, { color: isCompletedOrCurrent ? '#DAA520' : '#999' }]}>
                      {(t as any)[stepMeta.translationKey] || stepMeta.defaultLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Items List */}
          {order.items.map((item: any) => (
            <View key={item._id} style={screenStyles.itemRowImproved}>
              <Image 
                source={{ uri: `${S3_BASE_URL}/${item.productId?.images?.[0]}` }} 
                style={screenStyles.itemImageSmall} 
                defaultSource={require('../../assets/images/icon.png')} 
              />
              <View style={screenStyles.itemInfo}>
                <Text style={screenStyles.itemNameSmall} numberOfLines={1}>{item.productId?.name}</Text>
                <Text style={screenStyles.itemCatSmall}>
                  {(t.qtyLabel || 'Qty')}: {item.quantity} | {item.productId?.category}
                </Text>
              </View>
              <Text style={screenStyles.itemPriceSmall}>₹{item.price}</Text>
            </View>
          ))}

          <View style={screenStyles.totalRow}>
            <Text style={screenStyles.totalLabel}>{t.grandTotal || 'Grand Total'}</Text>
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
      
      {/* Scrollable Horizontal Filter View Capsule */}
      <View style={screenStyles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['ALL', 'PLACED', 'READY', 'ACCEPTED', 'DELIVERED', 'CANCEL_PENDING', 'CANCELLED', 'REJECTED'].map((filter) => {
             // Handle local filter button translations safely
             let displayLabel = filter;
             if (filter === 'ALL') displayLabel = t.all || 'ALL';
             else if (filter === 'PLACED') displayLabel = t.placed || 'PLACED';
             else if (filter === 'READY') displayLabel = t.ready || 'READY';
             else if (filter === 'ACCEPTED') displayLabel = t.accepted || 'ACCEPTED';
             else if (filter === 'DELIVERED') displayLabel = t.delivered || 'DELIVERED';
             else if (filter === 'REJECTED') displayLabel = t.rejected || 'REJECTED';
             else if (filter === 'CANCEL_PENDING') displayLabel = t.cancelRequestedShort || 'CANCEL REQ.';
             else if (filter === 'CANCELLED') displayLabel = t.statusCancelled || 'CANCELLED';

             return (
               <TouchableOpacity 
                 key={filter}
                 onPress={() => setSelectedFilter(filter)}
                 style={[
                     screenStyles.filterTabButton,
                     selectedFilter === filter && { backgroundColor: '#DAA520' }
                 ]}
               >
                 <Text style={[screenStyles.filterTabText, { color: selectedFilter === filter ? '#fff' : '#666' }]}>
                   {displayLabel}
                 </Text>
               </TouchableOpacity>
             );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#DAA520" />}
        ListEmptyComponent={
          <View style={screenStyles.emptyContainer}>
            <FontAwesome name="inbox" size={50} color="#ddd" />
            <Text style={screenStyles.emptyText}>{t.noOrdersFound || 'No orders found'}</Text>
          </View>
        }
      />
    </View>
  );
}