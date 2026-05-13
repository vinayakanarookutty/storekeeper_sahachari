import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
styles
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
import { styles } from './tab_style/three.style';

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  status:
    | 'PLACED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'READY'
    | 'PICKED_UP'
    | 'DELIVERED'
    | 'FAILED'
    | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

const STATUS_STEPS = [
  'PLACED',
  'READY',
  'ACCEPTED',
  'PICKED_UP',
  'DELIVERED',
];

const STATUS_CONFIG = {
  PLACED: {
    color: '#DAA520',
    icon: 'shopping-cart',
    label: 'Order Placed',
  },
  READY: {
    color: '#FF9800',
    icon: 'clock-o',
    label: 'Ready for Pickup',
  },
  ACCEPTED: {
    color: '#2E7D32',
    icon: 'check-circle',
    label: 'Accepted by Driver',
  },
  PICKED_UP: {
    color: '#9C27B0',
    icon: 'motorcycle',
    label: 'Picked Up',
  },
  DELIVERED: {
    color: '#4CAF50',
    icon: 'check-circle',
    label: 'Delivered',
  },
  REJECTED: {
    color: '#D32F2F',
    icon: 'times-circle',
    label: 'Rejected',
  },
  FAILED: {
    color: '#D32F2F',
    icon: 'exclamation-circle',
    label: 'Failed',
  },
  CANCELLED: {
    color: '#757575',
    icon: 'ban',
    label: 'Cancelled',
  },
};

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] =
    useState<string>('ALL');

  // NEW REFRESH STATE
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: orders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/storekeeper/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return response.json() as Promise<Order[]>;
    },
  });

  // NEW REFRESH FUNCTION
  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);

      await queryClient.invalidateQueries({
        queryKey: ['orders'],
      });

      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetch]);

  const markOrderReadyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/storekeeper/orders/${orderId}/ready`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.message ||
            'Failed to mark order as ready'
        );
      }

      return response.json();
    },

    onSuccess: async () => {
      Alert.alert(
        'Success',
        'Order marked as ready for pickup!'
      );

      await queryClient.invalidateQueries({
        queryKey: ['orders'],
      });

      refetch();
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

  const getCurrentStepIndex = (status: string) => {
    if (
      status === 'REJECTED' ||
      status === 'FAILED' ||
      status === 'CANCELLED'
    ) {
      return -1;
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

  const filterOptions = [
    'ALL',
    'PLACED',
    'READY',
    'ACCEPTED',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
  ];

  const filteredOrders =
    orders?.filter((order) =>
      selectedFilter === 'ALL'
        ? true
        : order.status === selectedFilter
    ) || [];

  const renderActionButtons = (order: Order) => {
    if (order.status === 'PLACED') {
      return (
        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>
            Actions
          </Text>

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
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <>
                  <FontAwesome
                    name="check-circle"
                    size={16}
                    color="#fff"
                  />

                  <Text style={styles.actionButtonText}>
                    Mark as Ready
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderOrderItem = ({
    item: order,
  }: {
    item: Order;
  }) => {
    const currentStep = getCurrentStepIndex(order.status);

    const isFailedStatus = currentStep === -1;

    const statusConfig =
      STATUS_CONFIG[order.status];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#FFFEF9', '#FFF9E6']}
          style={styles.orderCardGradient}
        >
          {/* HEADER */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderIdLabel}>
                Order ID
              </Text>

              <Text
                style={styles.orderId}
                numberOfLines={1}
              >
                {order.checkoutId}
              </Text>
            </View>

            <LinearGradient
              colors={[
                statusConfig.color,
                statusConfig.color + 'DD',
              ]}
              style={styles.statusBadge}
            >
              <FontAwesome
                name={statusConfig.icon as any}
                size={14}
                color="#fff"
              />

              <Text style={styles.statusBadgeText}>
                {statusConfig.label}
              </Text>
            </LinearGradient>
          </View>

          {/* CUSTOMER */}
          <View style={styles.customerSection}>
            <View style={styles.customerRow}>
              <View
                style={styles.customerIconContainer}
              >
                <FontAwesome
                  name="user"
                  size={16}
                  color="#DAA520"
                />
              </View>

              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {order.userId.name}
                </Text>

                <Text style={styles.customerEmail}>
                  {order.userId.email}
                </Text>
              </View>
            </View>
          </View>

          {/* PROGRESS */}
          {!isFailedStatus ? (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>
                Order Progress
              </Text>

              <View style={styles.progressSteps}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted =
                    index <= currentStep;

                  const isCurrent =
                    index === currentStep;

                  const stepConfig =
                    STATUS_CONFIG[
                      step as keyof typeof STATUS_CONFIG
                    ];

                  return (
                    <View
                      key={step}
                      style={styles.stepContainer}
                    >
                      <View
                        style={styles.stepIconWrapper}
                      >
                        {index > 0 && (
                          <View
                            style={[
                              styles.stepLine,
                              isCompleted &&
                                styles.stepLineCompleted,
                              {
                                backgroundColor:
                                  isCompleted
                                    ? stepConfig.color
                                    : '#E0E0E0',
                              },
                            ]}
                          />
                        )}

                        <LinearGradient
                          colors={
                            isCompleted
                              ? [
                                  stepConfig.color,
                                  stepConfig.color + 'DD',
                                ]
                              : ['#E0E0E0', '#F5F5F5']
                          }
                          style={[
                            styles.stepIcon,
                            isCurrent &&
                              styles.stepIconCurrent,
                          ]}
                        >
                          <FontAwesome
                            name={
                              stepConfig.icon as any
                            }
                            size={
                              isCurrent ? 18 : 14
                            }
                            color={
                              isCompleted
                                ? '#fff'
                                : '#999'
                            }
                          />
                        </LinearGradient>
                      </View>

                      <Text
                        style={[
                          styles.stepLabel,
                          isCompleted &&
                            styles.stepLabelCompleted,
                          isCurrent &&
                            styles.stepLabelCurrent,
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
                colors={[
                  statusConfig.color + '20',
                  statusConfig.color + '10',
                ]}
                style={styles.failedBanner}
              >
                <FontAwesome
                  name={statusConfig.icon as any}
                  size={24}
                  color={statusConfig.color}
                />

                <Text
                  style={[
                    styles.failedText,
                    {
                      color: statusConfig.color,
                    },
                  ]}
                >
                  Order {statusConfig.label}
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* ITEMS */}
          <View style={styles.itemsSection}>
            <View style={styles.sectionTitleRow}>
              <FontAwesome
                name="shopping-bag"
                size={16}
                color="#DAA520"
              />

              <Text style={styles.sectionTitle}>
                Items ({order.items.length})
              </Text>
            </View>

            {order.items
              .slice(0, 2)
              .map((item) => (
                <View
                  key={item._id}
                  style={styles.itemRow}
                >
                  <View
                    style={styles.itemImageContainer}
                  >
                    {item.productId.images &&
                    item.productId.images.length >
                      0 ? (
                      <Image
                        source={{
                          uri: `${S3_BASE_URL}/${item.productId.images[0]}`,
                        }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={styles.noItemImage}
                      >
                        <FontAwesome
                          name="image"
                          size={20}
                          color="#DAA520"
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <Text
                      style={styles.itemName}
                      numberOfLines={1}
                    >
                      {item.productId.name}
                    </Text>

                    <Text
                      style={styles.itemCategory}
                    >
                      {item.productId.category}
                    </Text>
                  </View>

                  <View
                    style={styles.itemPriceSection}
                  >
                    <Text
                      style={styles.itemQuantity}
                    >
                      x{item.quantity}
                    </Text>

                    <Text style={styles.itemPrice}>
                      ₹
                      {item.price.toLocaleString(
                        'en-IN'
                      )}
                    </Text>
                  </View>
                </View>
              ))}
          </View>

          {/* SUMMARY */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Total Amount
              </Text>

              <Text style={styles.summaryValue}>
                ₹
                {order.totalAmount.toLocaleString(
                  'en-IN'
                )}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Order Date
              </Text>

              <Text style={styles.summaryDate}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>

          {/* ACTIONS */}
          {renderActionButtons(order)}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <ActivityIndicator
          size="large"
          color="#DAA520"
        />

        <Text style={styles.loadingText}>
          Loading orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* FILTERS */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterScroll
          }
        >
          {filterOptions.map((filter) => {
            const isSelected =
              selectedFilter === filter;

            const statusConfig =
              filter !== 'ALL'
                ? STATUS_CONFIG[
                    filter as keyof typeof STATUS_CONFIG
                  ]
                : null;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() =>
                  setSelectedFilter(filter)
                }
                activeOpacity={0.7}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={
                      statusConfig
                        ? [
                            statusConfig.color,
                            statusConfig.color + 'DD',
                          ]
                        : ['#DAA520', '#B8860B']
                    }
                    style={styles.filterPill}
                  >
                    {statusConfig && (
                      <FontAwesome
                        name={
                          statusConfig.icon as any
                        }
                        size={14}
                        color="#fff"
                      />
                    )}

                    <Text
                      style={
                        styles.filterPillTextSelected
                      }
                    >
                      {filter === 'ALL'
                        ? 'All Orders'
                        : statusConfig?.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={
                      styles.filterPillInactive
                    }
                  >
                    {statusConfig && (
                      <FontAwesome
                        name={
                          statusConfig.icon as any
                        }
                        size={14}
                        color="#666"
                      />
                    )}

                    <Text
                      style={styles.filterPillText}
                    >
                      {filter === 'ALL'
                        ? 'All Orders'
                        : statusConfig?.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ORDERS LIST */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#DAA520']}
            tintColor="#DAA520"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <FontAwesome
              name="shopping-cart"
              size={64}
              color="#E0E0E0"
            />

            <Text style={styles.emptyTitle}>
              No orders found
            </Text>

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
