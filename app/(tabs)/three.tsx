import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  RefreshControl,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { getToken } from '../services/auth';
import { styles } from './tab_style/three.style';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const PRODUCT_STEPS = ['PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const SERVICE_STEPS = ['PLACED', 'ACCEPTED', 'DELIVERED'];

// Status Configuration - Matches your Backend Enums
const STATUS_CONFIG = {
  PLACED: { color: '#DAA520', icon: 'shopping-cart', label: 'Order Placed' },
  READY: { color: '#FF9800', icon: 'clock-o', label: 'Ready' },
  ACCEPTED: { color: '#2E7D32', icon: 'check-circle', label: 'Accepted' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle', label: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle', label: 'Completed' },
  CANCELLED: { color: '#D32F2F', icon: 'times-circle', label: 'Rejected' }, // Backend uses CANCELLED
};

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // 1. Fetch Orders with Auto-Polling (checks for new orders every 30s)
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

  // 2. Filter Logic
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (selectedFilter === 'ALL') return orders;
    return orders.filter((o: any) => o.status === selectedFilter);
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
      Alert.alert('Success', 'Order status updated');
    },
    onError: (error: any) => {
      Alert.alert('Action Failed', error.message);
    }
  });

  const handleAction = (orderId: string, endpoint: string, label: string) => {
    Alert.alert('Confirm', `Do you want to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateStatusMutation.mutate({ orderId, endpoint }) },
    ]);
  };

  const toggleExpand = (orderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const renderActionButtons = (order: any) => {
    // No actions for finished or cancelled orders
    if (['DELIVERED', 'CANCELLED', 'PICKED_UP'].includes(order.status)) return null;

    const isServiceOrRent = order.items.some((i: any) => 
        i.productId?.category === 'Service' || i.productId?.category === 'Rent'
    );
    const isSelfPickup = order.paymentMethod === 'SELF_PICKUP';

    return (
      <View style={[styles.actionsContainer, { gap: 10, marginTop: 15 }]}>
        {order.status === 'PLACED' && (
          <>
            <TouchableOpacity 
              style={{ flex: 2 }} 
              onPress={() => handleAction(order._id, 'ready', isServiceOrRent ? 'Accept' : 'Mark Ready')}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonText}>{isServiceOrRent ? 'ACCEPT' : 'MARK READY'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(order._id, 'reject', 'Reject Order')}
            >
              <LinearGradient colors={['#F44336', '#D32F2F']} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonText}>REJECT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Deliver button for Self-Pickup or Service items that don't need a driver */}
        {(order.status === 'READY' || order.status === 'ACCEPTED') && (isServiceOrRent || isSelfPickup) && (
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(order._id, 'deliver', 'Complete Order')}
            >
              <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonText}>COMPLETE / DELIVER</Text>
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
    const statusInfo = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PLACED;

    return (
      <View style={styles.orderCard}>
        <LinearGradient colors={['#FFFFFF', '#FDFBF0']} style={styles.orderCardGradient}>
          
          {/* Header */}
          <View style={styles.orderHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdLabel}>REF: #{order.checkoutId?.toUpperCase()}</Text>
              <Text style={{ fontSize: 10, color: '#888' }}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15', borderColor: statusInfo.color, borderWidth: 1 }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <TouchableOpacity onPress={() => toggleExpand(order._id)} style={styles.customerCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{order.userId?.name?.charAt(0) || '?'}</Text>
                  </View>
                  <Text style={styles.customerNameMain}>{order.userId?.name || 'Unknown'}</Text>
                </View>
                <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color="#AAA" />
            </View>
            {isExpanded && (
              <View style={styles.expandedDetails}>
                <Text style={styles.detailText}><FontAwesome name="phone" /> {order.deliveryAddress?.phone}</Text>
                <Text style={styles.detailText}><FontAwesome name="map-marker" /> {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</Text>
                {order.paymentMethod === 'SELF_PICKUP' && (
                  <View style={{ backgroundColor: '#E3F2FD', padding: 5, borderRadius: 4, marginTop: 5 }}>
                    <Text style={{ fontSize: 10, color: '#1976D2', fontWeight: 'bold' }}>SELF PICKUP ORDER</Text>
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
                  <View style={[styles.progressDot, { backgroundColor: index <= currentStep ? '#DAA520' : '#E0E0E0' }]}>
                    {index <= currentStep && <FontAwesome name="check" size={8} color="#fff" />}
                  </View>
                  <Text style={[styles.progressText, { color: index <= currentStep ? '#DAA520' : '#999' }]}>{step}</Text>
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
                <Text style={styles.itemNameSmall} numberOfLines={1}>{item.productId?.name}</Text>
                <Text style={styles.itemCatSmall}>Qty: {item.quantity} | {item.productId?.category}</Text>
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
      <View style={{ backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['ALL', 'PLACED', 'READY', 'ACCEPTED', 'DELIVERED', 'CANCELLED'].map((filter) => (
             <TouchableOpacity 
             key={filter}
             onPress={() => setSelectedFilter(filter)}
             style={[
                 { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#f5f5f5' },
                 selectedFilter === filter && { backgroundColor: '#DAA520' }
             ]}
           >
             <Text style={{ color: selectedFilter === filter ? '#fff' : '#666', fontWeight: 'bold', fontSize: 12 }}>
                 {filter === 'CANCELLED' ? 'REJECTED' : filter}
             </Text>
           </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#DAA520" />}
        ListEmptyComponent={
            <View style={{ marginTop: 100, alignItems: 'center' }}>
                <FontAwesome name="inbox" size={50} color="#ddd" />
                <Text style={{ color: '#999', marginTop: 10, fontSize: 16 }}>No orders found</Text>
            </View>
        }
      />
    </View>
  );
}