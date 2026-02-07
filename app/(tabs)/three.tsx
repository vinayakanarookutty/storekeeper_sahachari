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
  View
} from 'react-native';
import { getToken } from '../services/auth';

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width } = Dimensions.get('window');

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

  const { data: orders, isLoading, refetch, } = useQuery({
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

  // Mutation for marking order as ready (only action available to storekeeper)
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
      // Invalidate and refetch orders
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Ready',
          style: 'default',
          onPress: () => {
            markOrderReadyMutation.mutate(orderId);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#999';
  };

  const getStatusIcon = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.icon || 'question';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status;
  };

  const getCurrentStepIndex = (status: string) => {
    if (status === 'REJECTED' || status === 'FAILED' || status === 'CANCELLED') {
      return -1; // Special case for failed statuses
    }
    return STATUS_STEPS.indexOf(status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const extractNumericPrice = (price: number | string): number => {
    if (typeof price === 'number') return price;
    const numericString = price.toString().replace(/[^0-9.]/g, '');
    const numericPrice = parseFloat(numericString);
    return isNaN(numericPrice) ? 0 : numericPrice;
  };

  const filterOptions = ['ALL', 'PLACED', 'READY', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

  const filteredOrders = orders?.filter(order => 
    selectedFilter === 'ALL' ? true : order.status === selectedFilter
  ) || [];

  const renderActionButtons = (order: Order) => {
    // Only show "Mark as Ready" button for PLACED status orders
    // When clicked, it marks the order as READY for delivery boy to accept
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
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.actionButtonGradient}
            >
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

    // No action buttons for other statuses
    // READY → ACCEPTED → PICKED_UP → DELIVERED are handled by delivery boy
    return null;
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const currentStep = getCurrentStepIndex(order.status);
    const isFailedStatus = currentStep === -1;
    const statusConfig = STATUS_CONFIG[order.status];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.9}
        onPress={() => {
          // Navigate to order details if needed
        }}
      >
        <LinearGradient
          colors={['#FFFEF9', '#FFF9E6']}
          style={styles.orderCardGradient}
        >
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderId} numberOfLines={1}>
                {order.checkoutId}
              </Text>
            </View>
            <LinearGradient
              colors={[statusConfig.color, statusConfig.color + 'DD']}
              style={styles.statusBadge}
            >
              <FontAwesome name={statusConfig.icon as any} size={14} color="#fff" />
              <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
            </LinearGradient>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <View style={styles.customerRow}>
              <View style={styles.customerIconContainer}>
                <FontAwesome name="user" size={16} color="#DAA520" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order.userId.name}</Text>
                <Text style={styles.customerEmail}>{order.userId.email}</Text>
              </View>
            </View>
          </View>

          {/* Status Progress */}
          {!isFailedStatus ? (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Order Progress</Text>
              <View style={styles.progressSteps}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const stepConfig = STATUS_CONFIG[step as keyof typeof STATUS_CONFIG];

                  return (
                    <View key={step} style={styles.stepContainer}>
                      <View style={styles.stepIconWrapper}>
                        {index > 0 && (
                          <View
                            style={[
                              styles.stepLine,
                              isCompleted && styles.stepLineCompleted,
                              { backgroundColor: isCompleted ? stepConfig.color : '#E0E0E0' }
                            ]}
                          />
                        )}
                        <LinearGradient
                          colors={isCompleted ? [stepConfig.color, stepConfig.color + 'DD'] : ['#E0E0E0', '#F5F5F5']}
                          style={[
                            styles.stepIcon,
                            isCurrent && styles.stepIconCurrent,
                          ]}
                        >
                          <FontAwesome
                            name={stepConfig.icon as any}
                            size={isCurrent ? 18 : 14}
                            color={isCompleted ? '#fff' : '#999'}
                          />
                        </LinearGradient>
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCompleted && styles.stepLabelCompleted,
                          isCurrent && styles.stepLabelCurrent,
                        ]}
                      >
                        {stepConfig.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.failedSection}>
              <LinearGradient
                colors={[statusConfig.color + '20', statusConfig.color + '10']}
                style={styles.failedBanner}
              >
                <FontAwesome name={statusConfig.icon as any} size={24} color={statusConfig.color} />
                <Text style={[styles.failedText, { color: statusConfig.color }]}>
                  Order {statusConfig.label}
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Order Items */}
          <View style={styles.itemsSection}>
            <View style={styles.sectionTitleRow}>
              <FontAwesome name="shopping-bag" size={16} color="#DAA520" />
              <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
            </View>
            {order.items.slice(0, 2).map((item, index) => (
              <View key={item._id} style={styles.itemRow}>
                <View style={styles.itemImageContainer}>
                  {item.productId.images && item.productId.images.length > 0 ? (
                    <Image
                      source={{ uri: `${S3_BASE_URL}/${item.productId.images[0]}` }}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noItemImage}>
                      <FontAwesome name="image" size={20} color="#DAA520" />
                    </View>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.productId.name}
                  </Text>
                  <Text style={styles.itemCategory}>{item.productId.category}</Text>
                </View>
                <View style={styles.itemPriceSection}>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            ))}
            {order.items.length > 2 && (
              <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
            )}
          </View>

          {/* Delivery Address */}
          <View style={styles.addressSection}>
            <View style={styles.sectionTitleRow}>
              <FontAwesome name="map-marker" size={16} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            <LinearGradient
              colors={['#FFF9F9', '#FFFFFF']}
              style={styles.addressCard}
            >
              <Text style={styles.addressText}>
                {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </Text>
              <Text style={styles.addressText}>
                {order.deliveryAddress.zipCode}
              </Text>
              <View style={styles.phoneRow}>
                <FontAwesome name="phone" size={12} color="#666" />
                <Text style={styles.phoneText}>{order.deliveryAddress.phone}</Text>
              </View>
              {order.deliveryAddress.notes && (
                <View style={styles.notesContainer}>
                  <FontAwesome name="sticky-note-o" size={12} color="#FF9800" />
                  <Text style={styles.notesText}>{order.deliveryAddress.notes}</Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Order Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order Date</Text>
              <Text style={styles.summaryDate}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>

          {/* Pickup Address */}
          <View style={styles.pickupSection}>
            <View style={styles.pickupIconRow}>
              <FontAwesome name="home" size={14} color="#DAA520" />
              <Text style={styles.pickupLabel}>Pickup from: </Text>
              <Text style={styles.pickupAddress}>{order.pickupAddress}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {renderActionButtons(order)}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#DAA520" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterOptions.map((filter) => {
            const isSelected = selectedFilter === filter;
            const statusConfig = filter !== 'ALL' ? STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG] : null;
            
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.7}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={statusConfig ? [statusConfig.color, statusConfig.color + 'DD'] : ['#DAA520', '#B8860B']}
                    style={styles.filterPill}
                  >
                    {statusConfig && (
                      <FontAwesome name={statusConfig.icon as any} size={14} color="#fff" />
                    )}
                    <Text style={styles.filterPillTextSelected}>
                      {filter === 'ALL' ? 'All Orders' : statusConfig?.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterPillInactive}>
                    {statusConfig && (
                      <FontAwesome name={statusConfig.icon as any} size={14} color="#666" />
                    )}
                    <Text style={styles.filterPillText}>
                      {filter === 'ALL' ? 'All Orders' : statusConfig?.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // refreshControl={
        //   <RefreshControl
        //     refreshing={isRefreshing}
        //     onRefresh={refetch}
        //     colors={['#DAA520']}
        //     tintColor="#DAA520"
        //   />
        // }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <FontAwesome name="shopping-cart" size={64} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter !== 'ALL' 
                ? `No ${selectedFilter.toLowerCase()} orders at the moment`
                : 'Orders will appear here once customers place them'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  filterPillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  filterPillTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  orderCardGradient: {
    padding: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerSection: {
    marginBottom: 20,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2416',
  },
  customerEmail: {
    fontSize: 13,
    color: '#666',
  },
  progressSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2416',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  stepIconWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  stepLine: {
    position: 'absolute',
    right: '50%',
    width: width / 5 - 40,
    height: 2,
    top: 17,
  },
  stepLineCompleted: {
    backgroundColor: '#4A90E2',
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepIconCurrent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelCompleted: {
    color: '#2D2416',
    fontWeight: '600',
  },
  stepLabelCurrent: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  failedSection: {
    marginBottom: 20,
  },
  failedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  failedText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemsSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  itemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noItemImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
  },
  itemCategory: {
    fontSize: 12,
    color: '#999',
  },
  itemPriceSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DAA520',
  },
  moreItems: {
    fontSize: 13,
    color: '#DAA520',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  addressSection: {
    marginBottom: 20,
  },
  addressCard: {
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#2D2416',
    lineHeight: 20,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  summarySection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  summaryDate: {
    fontSize: 13,
    color: '#2D2416',
    fontWeight: '600',
  },
  pickupSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 16,
  },
  pickupIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickupLabel: {
    fontSize: 13,
    color: '#666',
  },
  pickupAddress: {
    fontSize: 13,
    color: '#2D2416',
    fontWeight: '600',
    flex: 1,
  },
  actionsSection: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  actionsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2416',
    marginBottom: 4,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});