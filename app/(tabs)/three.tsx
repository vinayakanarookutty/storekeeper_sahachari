import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  View
} from 'react-native';
import { getToken } from '../services/auth';

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width } = Dimensions.get('window');

// --- Interfaces ---
interface Product {
  _id: string;
  name: string;
  description: string;
  price: string | number;
  images: string[];
  category: string;
}

interface OrderItem {
  productId: Product;
  quantity: number;
  price: number;
  _id: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  zipCode: string;
  phone: string;
  notes?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Order {
  _id: string;
  userId: User;
  storeId: string;
  checkoutId: string;
  deliveryBoyId: string | null;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  pickupAddress: string;
  status: 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

// --- Configuration ---
const STATUS_STEPS = ['PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];

const STATUS_CONFIG = {
  PLACED: { color: '#DAA520', icon: 'shopping-cart', label: 'Order Placed' },
  READY: { color: '#FF9800', icon: 'clock-o', label: 'Ready for Pickup' },
  ACCEPTED: { color: '#2E7D32', icon: 'check-circle', label: 'Accepted by Driver' },
  PICKED_UP: { color: '#9C27B0', icon: 'motorcycle', label: 'Picked Up' },
  DELIVERED: { color: '#4CAF50', icon: 'check-circle', label: 'Delivered' },
  REJECTED: { color: '#D32F2F', icon: 'times-circle', label: 'Rejected' },
  FAILED: { color: '#D32F2F', icon: 'exclamation-circle', label: 'Failed' },
  CANCELLED: { color: '#757575', icon: 'ban', label: 'Cancelled' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Query for fetching orders
  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return response.json() as Promise<Order[]>;
    },
    
  });

  // Mutation for marking order as ready
  const markOrderReadyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders/${orderId}/ready`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark order as ready');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Order marked as ready for pickup!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleMarkReady = (orderId: string) => {
    Alert.alert(
      'Mark Order as Ready',
      'Mark this order as ready for pickup by delivery boy?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Ready', onPress: () => markOrderReadyMutation.mutate(orderId) },
      ]
    );
  };

  const getCurrentStepIndex = (status: string) => {
    if (['REJECTED', 'FAILED', 'CANCELLED'].includes(status)) return -1;
    return STATUS_STEPS.indexOf(status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const filterOptions = ['ALL', 'PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

  const filteredOrders = orders?.filter(order => 
    selectedFilter === 'ALL' ? true : order.status === selectedFilter
  ) || [];

  const renderActionButtons = (order: Order) => {
    if (order.status === 'PLACED') {
      return (
        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => handleMarkReady(order._id)}
            disabled={markOrderReadyMutation.isPending}
          >
            <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.actionButtonGradient}>
              {markOrderReadyMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Ready</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const currentStep = getCurrentStepIndex(order.status);
    const isFailedStatus = currentStep === -1;
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PLACED;

    return (
      <View style={styles.orderCard}>
        <LinearGradient colors={['#FFFEF9', '#FFF9E6']} style={styles.orderCardGradient}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderId} numberOfLines={1}>{order.checkoutId}</Text>
            </View>
            <LinearGradient colors={[statusConfig.color, statusConfig.color + 'DD']} style={styles.statusBadge}>
              <FontAwesome name={statusConfig.icon as any} size={12} color="#fff" />
              <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
            </LinearGradient>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <View style={styles.customerRow}>
              <FontAwesome name="user" size={20} color="#DAA520" />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order.userId.name}</Text>
                <Text style={styles.customerEmail}>{order.userId.email}</Text>
              </View>
            </View>
          </View>

          {/* Progress Section */}
          {!isFailedStatus && (
            <View style={styles.progressSection}>
              <View style={styles.progressSteps}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const stepColor = STATUS_CONFIG[step as keyof typeof STATUS_CONFIG].color;
                  return (
                    <View key={step} style={[styles.stepDot, { backgroundColor: isCompleted ? stepColor : '#E0E0E0' }]} />
                  );
                })}
              </View>
            </View>
          )}

          {/* Items */}
          <View style={styles.itemsSection}>
            {order.items.slice(0, 2).map((item) => (
              <View key={item._id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productId.name} x{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
            ))}
            {order.items.length > 2 && <Text style={styles.moreItems}>+{order.items.length - 2} more</Text>}
          </View>

          {/* Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Total: ₹{order.totalAmount}</Text>
            <Text style={styles.summaryDate}>{formatDate(order.createdAt)}</Text>
          </View>

          {renderActionButtons(order)}
        </LinearGradient>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAA520" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterOptions.map((filter) => (
            <TouchableOpacity 
              key={filter} 
              onPress={() => setSelectedFilter(filter)} 
              style={[styles.filterPill, selectedFilter === filter && styles.filterPillSelected]}
            >
              <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextSelected]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#DAA520']}
            tintColor="#DAA520"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <FontAwesome name="shopping-cart" size={48} color="#EEE" />
            <Text style={styles.emptyTitle}>No orders found</Text>
          </View>
        )}
      />
    </View>
  );
  
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  
  // Filter Section
  filterContainer: { paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  filterScroll: { paddingHorizontal: 16 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 25, backgroundColor: '#F0F0F0', marginRight: 10 },
  filterPillSelected: { backgroundColor: '#DAA520' },
  filterPillText: { fontSize: 13, color: '#666', fontWeight: '600' },
  filterPillTextSelected: { color: '#fff' },
  
  listContent: { padding: 16, paddingBottom: 30 },

  // Card Overhaul
  orderCard: { 
    marginBottom: 20, 
    borderRadius: 16, 
    overflow: 'hidden', 
    elevation: 4, 
    shadowOpacity: 0.12, 
    shadowRadius: 6, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#fff' 
  },
  orderCardGradient: { padding: 20 },

  actionsSectionTitle: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#BBB', 
    marginBottom: 10, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },

  // Header Logic
  orderHeader: { marginBottom: 18 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start' 
  },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' },
  
  orderHeaderLeft: { width: '100%' },
  orderIdLabel: { fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  orderId: { fontSize: 15, fontWeight: '700', color: '#222' },

  // Customer Section (Parallel Icon & Name)
  customerSection: { marginBottom: 20 },
  customerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  customerIconContainer: { 
    width: 0, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#FFF5D1', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  customerInfo: { flex: 1, justifyContent: 'center' },
  customerName: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 2 },
  customerEmail: { fontSize: 13, color: '#888' },

  // Progress Section (Spacing)
  progressSection: { marginBottom: 22 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#BBB', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressSteps: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stepDot: { height: 5, flex: 1, borderRadius: 3, backgroundColor: '#E0E0E0' },

  // Items Section (Clean Left/Right Split)
  itemsSection: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 18, marginBottom: 18 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#444', flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#222', marginLeft: 10 },
  moreItems: { fontSize: 12, color: '#DAA520', marginTop: 4, fontWeight: '600' },

  // Summary Section (The Boxy Look)
  summarySection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  summaryRow: { flex: 1 },
  summaryLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#DAA520' },
  summaryDate: { fontSize: 12, color: '#AAA', fontWeight: '500' },

  // Actions
  actionsSection: { marginTop: 10 },
  actionButton: { borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '800', marginLeft: 10, fontSize: 15 },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { marginTop: 20, color: '#CCC', fontSize: 18, fontWeight: '600' }
});