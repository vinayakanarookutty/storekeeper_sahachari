import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  View,
} from 'react-native';

import { getToken } from '../services/auth';
import { screenStyles } from '../tab_style/three.style';
import { useLanguage } from '../contexts/LanguageContext';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* =========================================================
   CONFIG
========================================================= */

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000';

/* =========================================================
   WORKFLOW
========================================================= */

const PRODUCT_STEPS = [
  'PLACED',
  'READY',
  'ACCEPTED',
  'PICKED_UP',
  'DELIVERED',
];

const SERVICE_STEPS = [
  'PLACED',
  'ACCEPTED',
  'DELIVERED',
];

/* =========================================================
   STEP ICONS
========================================================= */

const STEP_ICON_CONFIG: Record<
  string,
  {
    icon: string;
    translationKey: string;
    defaultLabel: string;
  }
> = {
  PLACED: {
    icon: 'shopping-cart',
    translationKey: 'ready',
    defaultLabel: 'Placed',
  },

  READY: {
    icon: 'clock-o',
    translationKey: 'statusReady',
    defaultLabel: 'Ready',
  },

  ACCEPTED: {
    icon: 'thumbs-up',
    translationKey: 'statusAccepted',
    defaultLabel: 'Accepted',
  },

  PICKED_UP: {
    icon: 'motorcycle',
    translationKey: 'statusPickedUp',
    defaultLabel: 'Picked Up',
  },

  DELIVERED: {
    icon: 'check-circle',
    translationKey: 'delivered',
    defaultLabel: 'Delivered',
  },
};

/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    icon: string;
    translationKey: string;
    defaultLabel: string;
  }
> = {
  PLACED: {
    color: '#DAA520',
    icon: 'shopping-cart',
    translationKey: 'statusPlaced',
    defaultLabel: 'Order Placed',
  },

  READY: {
    color: '#FF9800',
    icon: 'clock-o',
    translationKey: 'statusReady',
    defaultLabel: 'Ready',
  },

  ACCEPTED: {
    color: '#2E7D32',
    icon: 'check-circle',
    translationKey: 'statusAccepted',
    defaultLabel: 'Accepted',
  },

  PICKED_UP: {
    color: '#9C27B0',
    icon: 'motorcycle',
    translationKey: 'statusPickedUp',
    defaultLabel: 'Picked Up',
  },

  DELIVERED: {
    color: '#4CAF50',
    icon: 'check-circle',
    translationKey: 'statusCompleted',
    defaultLabel: 'Completed',
  },

  REJECTED: {
    color: '#D32F2F',
    icon: 'times-circle',
    translationKey: 'statusRejected',
    defaultLabel: 'Rejected',
  },

  FAILED: {
    color: '#757575',
    icon: 'exclamation-triangle',
    translationKey: 'statusFailed',
    defaultLabel: 'Failed',
  },

  CANCEL_PENDING: {
    color: '#E65100',
    icon: 'exclamation-circle',
    translationKey: 'cancelRequestedLabel',
    defaultLabel: 'Cancel Requested',
  },

  CANCELLED: {
    color: '#D32F2F',
    icon: 'ban',
    translationKey: 'statusCancelled',
    defaultLabel: 'Cancelled',
  },
};

/* =========================================================
   DATE FILTER TYPE
========================================================= */

type DateFilter =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'CUSTOM';

/* =========================================================
   HELPERS
========================================================= */

/**
 * Convert Date -> YYYY-MM-DD
 * Used by browser <input type="date">
 */
const dateToInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Convert YYYY-MM-DD -> local Date
 *
 * IMPORTANT:
 * new Date("2026-08-15") can be interpreted as UTC.
 * This function creates the date in local time.
 */
const inputValueToDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parts = value.split('-');

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/* =========================================================
   SCREEN
========================================================= */

export default function OrdersScreen() {
  const { t } = useLanguage();

  const queryClient = useQueryClient();

  /* =======================================================
     STATE
  ======================================================= */

  const [selectedFilter, setSelectedFilter] =
    useState<string>('ALL');

  const [selectedDateFilter, setSelectedDateFilter] =
    useState<DateFilter>('ALL');

  const [customDate, setCustomDate] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [expandedOrders, setExpandedOrders] =
    useState<Record<string, boolean>>({});

  /* =======================================================
     ALERT
  ======================================================= */

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `${title}\n\n${message}`
      );

      if (confirmed) {
        onConfirm();
      }

      return;
    }

    Alert.alert(title, message, [
      {
        text: t.cancel || 'Cancel',
        style: 'cancel',
      },
      {
        text: t.confirmTitle || 'Confirm',
        onPress: onConfirm,
      },
    ]);
  };

  const showAlert = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

  const {
    data: orders = [],
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
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        let message = 'Failed to fetch orders';

        try {
          const result = await response.json();

          if (result?.message) {
            message = result.message;
          }
        } catch {
          // Ignore JSON parsing failure
        }

        throw new Error(message);
      }

      const result = await response.json();

      return Array.isArray(result)
        ? result
        : result?.orders || [];
    },

    refetchInterval: 30000,
  });

  /* =======================================================
     DATE HELPERS
  ======================================================= */

  const startOfDay = (date: Date) => {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    return result;
  };

  const endOfDay = (date: Date) => {
    const result = new Date(date);

    result.setHours(23, 59, 59, 999);

    return result;
  };

  const isSameDay = (
    first: Date,
    second: Date
  ) => {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  };

  /* =======================================================
     DATE FILTER
  ======================================================= */

  const isOrderInDateFilter = (
    orderDate: Date
  ) => {
    const today = new Date();

    switch (selectedDateFilter) {
      case 'TODAY':
        return isSameDay(orderDate, today);

      case 'YESTERDAY': {
        const yesterday = new Date(today);

        yesterday.setDate(
          yesterday.getDate() - 1
        );

        return isSameDay(
          orderDate,
          yesterday
        );
      }

      case 'LAST_7_DAYS': {
        const start = new Date(today);

        start.setDate(
          start.getDate() - 6
        );

        return (
          orderDate >= startOfDay(start) &&
          orderDate <= endOfDay(today)
        );
      }

      case 'LAST_30_DAYS': {
        const start = new Date(today);

        start.setDate(
          start.getDate() - 29
        );

        return (
          orderDate >= startOfDay(start) &&
          orderDate <= endOfDay(today)
        );
      }

      case 'CUSTOM':
        if (!customDate) {
          return true;
        }

        return isSameDay(
          orderDate,
          customDate
        );

      case 'ALL':
      default:
        return true;
    }
  };

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) {
      return [];
    }

    const result = orders.filter((order: any) => {
      /* ---------------------------------------------------
         STATUS
      --------------------------------------------------- */

      let statusMatches = true;

      if (selectedFilter !== 'ALL') {
        const orderStatus =
          order.status?.toUpperCase() || '';

        const cancellationSource =
          order.cancelledBy?.toLowerCase() || '';

        if (selectedFilter === 'REJECTED') {
          statusMatches =
            orderStatus === 'REJECTED' ||
            (
              orderStatus === 'CANCELLED' &&
              (
                cancellationSource === 'user' ||
                cancellationSource === 'admin' ||
                cancellationSource === 'superadmin'
              )
            );
        } else if (
          selectedFilter === 'CANCELLED'
        ) {
          statusMatches =
            orderStatus === 'CANCELLED' &&
            cancellationSource !== 'user' &&
            cancellationSource !== 'admin' &&
            cancellationSource !== 'superadmin';
        } else {
          statusMatches =
            orderStatus === selectedFilter;
        }
      }

      /* ---------------------------------------------------
         DATE
      --------------------------------------------------- */

      const orderDate = new Date(
        order.createdAt
      );

      const validDate =
        !Number.isNaN(
          orderDate.getTime()
        );

      const dateMatches =
        validDate &&
        isOrderInDateFilter(
          orderDate
        );

      return (
        statusMatches &&
        dateMatches
      );
    });

    /* -----------------------------------------------------
       NEWEST FIRST
    ----------------------------------------------------- */

    return [...result].sort(
      (a: any, b: any) => {
        const dateA =
          new Date(
            a.createdAt
          ).getTime();

        const dateB =
          new Date(
            b.createdAt
          ).getTime();

        return dateB - dateA;
      }
    );
  }, [
    orders,
    selectedFilter,
    selectedDateFilter,
    customDate,
  ]);

  /* =======================================================
     NATIVE DATE PICKER
     Android / iOS
  ======================================================= */

  const handleNativeDateChange = (
    event: any,
    selected?: Date
  ) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (
      event?.type === 'dismissed'
    ) {
      return;
    }

    if (selected) {
      setCustomDate(selected);
      setSelectedDateFilter('CUSTOM');

      if (Platform.OS === 'ios') {
        // Keep iOS picker visible while selecting.
      }
    }
  };

  /* =======================================================
     WEB DATE PICKER
  ======================================================= */

  const handleWebDateChange = (
    value: string
  ) => {
    const date =
      inputValueToDate(value);

    if (!date) {
      return;
    }

    setCustomDate(date);
    setSelectedDateFilter('CUSTOM');
  };

  /* =======================================================
     OPEN DATE PICKER
  ======================================================= */

  const openCustomDatePicker = () => {
    if (Platform.OS === 'web') {
      // Browser input is rendered directly in the UI.
      return;
    }

    setShowDatePicker(true);
  };

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate = (
    date: Date
  ) => {
    return date.toLocaleDateString(
      undefined,
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  const updateStatusMutation =
    useMutation({
      mutationFn: async ({
        orderId,
        endpoint,
      }: {
        orderId: string;
        endpoint: string;
      }) => {
        const token =
          await getToken();

        const response =
          await fetch(
            `${API_BASE_URL}/storekeeper/orders/${orderId}/${endpoint}`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
            }
          );

        let result: any = {};

        try {
          result =
            await response.json();
        } catch {
          // Backend may return empty body.
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              'Update failed'
          );
        }

        return result;
      },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['orders'],
        });

        showAlert(
          t.successTitle ||
            'Success',
          t.statusUpdatedSuccess ||
            'Order status updated'
        );
      },

      onError: (error: any) => {
        showAlert(
          t.failedTitle ||
            'Action Failed',
          error?.message ||
            'Could not update order'
        );
      },
    });

  /* =======================================================
     HANDLE ACTION
  ======================================================= */

  const handleAction = (
    orderId: string,
    endpoint: string,
    confirmationMsg: string
  ) => {
    showConfirmation(
      t.confirmTitle ||
        'Confirm',
      confirmationMsg,
      () => {
        updateStatusMutation.mutate({
          orderId,
          endpoint,
        });
      }
    );
  };

  /* =======================================================
     EXPAND ORDER
  ======================================================= */

  const toggleExpand = (
    orderId: string
  ) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets
          .easeInEaseOut
      );
    }

    setExpandedOrders(
      prev => ({
        ...prev,
        [orderId]:
          !prev[orderId],
      })
    );
  };

  /* =======================================================
     ACTION BUTTONS
  ======================================================= */

  const renderActionButtons = (
    order: any
  ) => {
    if (
      [
        'DELIVERED',
        'CANCELLED',
        'REJECTED',
        'FAILED',
        'PICKED_UP',
        'CANCEL_PENDING',
      ].includes(
        order.status
      )
    ) {
      return null;
    }

    const items = Array.isArray(
      order.items
    )
      ? order.items
      : [];

    const isServiceOrRent =
      items.some(
        (item: any) =>
          item.productId?.category ===
            'Service' ||
          item.productId?.category ===
            'Rent'
      );

    const isSelfPickup =
      order.paymentMethod ===
      'SELF_PICKUP';

    const anyPending =
      updateStatusMutation.isPending;

    const isThisOrderPending =
      anyPending &&
      updateStatusMutation
        .variables?.orderId ===
        order._id;

    const pendingEndpoint =
      isThisOrderPending
        ? updateStatusMutation
            .variables?.endpoint
        : null;

    return (
      <View
        style={
          screenStyles.actionsContainer
        }
      >
        {/* ---------------------------------------------
            PLACED
        --------------------------------------------- */}

        {order.status ===
          'PLACED' && (
          <>
            <TouchableOpacity
              style={{
                flex: 2,
              }}
              disabled={anyPending}
              onPress={() =>
                handleAction(
                  order._id,
                  'ready',
                  isServiceOrRent
                    ? t.confirmAcceptOrder ||
                        'Do you want to Accept this order?'
                    : t.confirmMarkReady ||
                        'Do you want to Mark this order Ready?'
                )
              }
            >
              <LinearGradient
                colors={[
                  '#4CAF50',
                  '#2E7D32',
                ]}
                style={
                  screenStyles.actionButtonGradient
                }
              >
                {pendingEndpoint ===
                'ready' ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      screenStyles.actionButtonText
                    }
                  >
                    {isServiceOrRent
                      ? t.accept ||
                        'ACCEPT'
                      : t.markReady ||
                        'MARK READY'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
              }}
              disabled={anyPending}
              onPress={() =>
                handleAction(
                  order._id,
                  'reject',
                  t.confirmRejectOrder ||
                    'Do you want to Reject this Order?'
                )
              }
            >
              <LinearGradient
                colors={[
                  '#F44336',
                  '#D32F2F',
                ]}
                style={
                  screenStyles.actionButtonGradient
                }
              >
                {pendingEndpoint ===
                'reject' ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      screenStyles.actionButtonText
                    }
                  >
                    {t.reject ||
                      'REJECT'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ---------------------------------------------
            READY / ACCEPTED
        --------------------------------------------- */}

        {(
          order.status ===
            'READY' ||
          order.status ===
            'ACCEPTED'
        ) &&
          (
            isServiceOrRent ||
            isSelfPickup
          ) && (
            <TouchableOpacity
              style={{
                flex: 1,
              }}
              disabled={anyPending}
              onPress={() =>
                handleAction(
                  order._id,
                  'deliver',
                  t.confirmCompleteOrder ||
                    'Do you want to Complete this Order?'
                )
              }
            >
              <LinearGradient
                colors={[
                  '#2196F3',
                  '#1976D2',
                ]}
                style={
                  screenStyles.actionButtonGradient
                }
              >
                {pendingEndpoint ===
                'deliver' ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      screenStyles.actionButtonText
                    }
                  >
                    {t.completeDeliver ||
                      'COMPLETE / DELIVER'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  /* =======================================================
     RENDER ORDER
  ======================================================= */

  const renderOrderItem = ({
    item: order,
  }: {
    item: any;
  }) => {
    const items = Array.isArray(
      order.items
    )
      ? order.items
      : [];

    const isServiceOrRent =
      items.some(
        (item: any) =>
          item.productId?.category ===
            'Service' ||
          item.productId?.category ===
            'Rent'
      );

    const steps = isServiceOrRent
      ? SERVICE_STEPS
      : PRODUCT_STEPS;

    const currentStep =
      steps.indexOf(
        order.status
      );

    const isExpanded =
      expandedOrders[
        order._id
      ];

    let displayStatus =
      order.status;

    /* -----------------------------------------------
       CANCELLED BY USER/ADMIN = REJECTED
    ----------------------------------------------- */

    if (
      order.status ===
        'CANCELLED' &&
      (
        order.cancelledBy ===
          'user' ||
        order.cancelledBy ===
          'admin' ||
        order.cancelledBy ===
          'superadmin'
      )
    ) {
      displayStatus =
        'REJECTED';
    }

    const statusInfo =
      STATUS_CONFIG[
        displayStatus
      ] ||
      STATUS_CONFIG.PLACED;

    const showCancelIndicator =
      order.status ===
        'CANCEL_PENDING' ||
      order.status ===
        'CANCELLED';

    const orderDate =
      new Date(
        order.createdAt
      );

    return (
      <View
        style={
          screenStyles.orderCard
        }
      >
        <LinearGradient
          colors={[
            '#FFFFFF',
            '#FDFBF0',
          ]}
          style={
            screenStyles.orderCardGradient
          }
        >
          {/* =========================================
              HEADER
          ========================================== */}

          <View
            style={
              screenStyles.orderHeader
            }
          >
            <View
              style={
                screenStyles.headerLeftRef
              }
            >
              {showCancelIndicator && (
                <FontAwesome
                  name={
                    statusInfo.icon as any
                  }
                  size={16}
                  color={
                    statusInfo.color
                  }
                />
              )}

              <Text
                style={
                  screenStyles.orderIdLabel
                }
              >
                {t.refLabel ||
                  'REF'}
                : #
                {order.checkoutId?.toUpperCase() ||
                  order._id?.substring(
                    0,
                    8
                  ).toUpperCase()}
              </Text>
            </View>

            <View
              style={[
                screenStyles.statusBadge,
                {
                  backgroundColor:
                    statusInfo.color +
                    '12',
                  borderColor:
                    statusInfo.color,
                },
              ]}
            >
              <FontAwesome
                name={
                  statusInfo.icon as any
                }
                size={11}
                color={
                  statusInfo.color
                }
              />

              <Text
                style={[
                  screenStyles.statusBadgeText,
                  {
                    color:
                      statusInfo.color,
                  },
                ]}
              >
                {(t as any)[
                  statusInfo
                    .translationKey
                ] ||
                  statusInfo.defaultLabel}
              </Text>
            </View>
          </View>

          {/* =========================================
              DATE + TIME
          ========================================== */}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <FontAwesome
              name="calendar"
              size={13}
              color="#A89378"
            />

            <Text
              style={[
                screenStyles.dateText,
                {
                  marginLeft: 7,
                },
              ]}
            >
              {!Number.isNaN(
                orderDate.getTime()
              )
                ? formatDate(
                    orderDate
                  )
                : 'Unknown date'}
            </Text>

            {!Number.isNaN(
              orderDate.getTime()
            ) && (
              <Text
                style={{
                  color: '#999',
                  fontSize: 12,
                  marginLeft: 8,
                }}
              >
                {orderDate.toLocaleTimeString(
                  undefined,
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </Text>
            )}
          </View>

          {/* =========================================
              CUSTOMER
          ========================================== */}

          <TouchableOpacity
            onPress={() =>
              toggleExpand(
                order._id
              )
            }
            style={
              screenStyles.customerCard
            }
            activeOpacity={0.8}
          >
            <View
              style={
                screenStyles.customerRow
              }
            >
              <View
                style={
                  screenStyles.customerMainLeft
                }
              >
                <View
                  style={
                    screenStyles.avatarCircle
                  }
                >
                  <Text
                    style={
                      screenStyles.avatarText
                    }
                  >
                    {order.userId?.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      '?'}
                  </Text>
                </View>

                <Text
                  style={
                    screenStyles.customerNameMain
                  }
                >
                  {order.userId?.name ||
                    t.unknownUser ||
                    'Unknown'}
                </Text>
              </View>

              <FontAwesome
                name={
                  isExpanded
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={12}
                color="#AAA"
              />
            </View>

            {isExpanded && (
              <View
                style={
                  screenStyles.expandedDetails
                }
              >
                {order.deliveryAddress
                  ?.phone && (
                  <Text
                    style={
                      screenStyles.detailText
                    }
                  >
                    <FontAwesome name="phone" />{' '}
                    {
                      order
                        .deliveryAddress
                        ?.phone
                    }
                  </Text>
                )}

                {(order.deliveryAddress
                  ?.street ||
                  order.deliveryAddress
                    ?.city) && (
                  <Text
                    style={
                      screenStyles.detailText
                    }
                  >
                    <FontAwesome name="map-marker" />{' '}
                    {
                      order
                        .deliveryAddress
                        ?.street
                    }
                    {order.deliveryAddress
                      ?.street &&
                    order
                      .deliveryAddress
                      ?.city
                      ? ', '
                      : ''}
                    {
                      order
                        .deliveryAddress
                        ?.city
                    }
                  </Text>
                )}

                {order.paymentMethod ===
                  'SELF_PICKUP' && (
                  <View
                    style={
                      screenStyles.selfPickupBadge
                    }
                  >
                    <Text
                      style={
                        screenStyles.selfPickupText
                      }
                    >
                      {t.selfPickupBadge ||
                        'SELF PICKUP ORDER'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* =========================================
              WORKFLOW
          ========================================== */}

          {![
            'CANCELLED',
            'CANCEL_PENDING',
            'REJECTED',
            'FAILED',
          ].includes(
            order.status
          ) && (
            <View
              style={
                screenStyles.progressContainer
              }
            >
              {steps.map(
                (
                  step,
                  index
                ) => {
                  const isCompletedOrCurrent =
                    index <=
                    currentStep;

                  const stepMeta =
                    STEP_ICON_CONFIG[
                      step
                    ] || {
                      icon: 'circle',
                      translationKey:
                        step,
                      defaultLabel:
                        step,
                    };

                  return (
                    <View
                      key={step}
                      style={
                        screenStyles.stepBlock
                      }
                    >
                      <View
                        style={[
                          screenStyles.progressIconCircle,
                          {
                            backgroundColor:
                              isCompletedOrCurrent
                                ? '#DAA520'
                                : '#E0E0E0',
                          },
                        ]}
                      >
                        <FontAwesome
                          name={
                            stepMeta.icon as any
                          }
                          size={11}
                          color={
                            isCompletedOrCurrent
                              ? '#fff'
                              : '#999'
                          }
                        />
                      </View>

                      <Text
                        style={[
                          screenStyles.progressText,
                          {
                            color:
                              isCompletedOrCurrent
                                ? '#DAA520'
                                : '#999',
                          },
                        ]}
                      >
                        {(t as any)[
                          stepMeta
                            .translationKey
                        ] ||
                          stepMeta.defaultLabel}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          )}

          {/* =========================================
              ITEMS
          ========================================== */}

          {items.map(
            (
              item: any,
              index: number
            ) => {
              const image =
                item.productId
                  ?.images?.[0];

              const imageUri = image
                ? image.startsWith(
                    'http'
                  )
                  ? image
                  : `${S3_BASE_URL}/${image}`
                : null;

              return (
                <View
                  key={
                    item._id ||
                    `${order._id}-${index}`
                  }
                  style={
                    screenStyles.itemRowImproved
                  }
                >
                  {imageUri ? (
                    <Image
                      source={{
                        uri: imageUri,
                      }}
                      style={
                        screenStyles.itemImageSmall
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        screenStyles.itemImageSmall,
                        {
                          backgroundColor:
                            '#F0EFEA',
                          justifyContent:
                            'center',
                          alignItems:
                            'center',
                        },
                      ]}
                    >
                      <FontAwesome
                        name="cube"
                        size={18}
                        color="#A89378"
                      />
                    </View>
                  )}

                  <View
                    style={
                      screenStyles.itemInfo
                    }
                  >
                    <Text
                      style={
                        screenStyles.itemNameSmall
                      }
                      numberOfLines={1}
                    >
                      {item.productId
                        ?.name ||
                        'Product'}
                    </Text>

                    <Text
                      style={
                        screenStyles.itemCatSmall
                      }
                    >
                      {t.qtyLabel ||
                        'Qty'}
                      : {item.quantity} |{' '}
                      {item.productId
                        ?.category ||
                        'Product'}
                    </Text>
                  </View>

                  <Text
                    style={
                      screenStyles.itemPriceSmall
                    }
                  >
                    ₹
                    {item.price ||
                      0}
                  </Text>
                </View>
              );
            }
          )}

          {/* =========================================
              TOTAL
          ========================================== */}

          <View
            style={
              screenStyles.totalRow
            }
          >
            <Text
              style={
                screenStyles.totalLabel
              }
            >
              {t.grandTotal ||
                'Grand Total'}
            </Text>

            <Text
              style={
                screenStyles.totalValue
              }
            >
              ₹
              {order.itemsSubtotal ||
                order.totalAmount ||
                0}
            </Text>
          </View>

          {/* =========================================
              ACTIONS
          ========================================== */}

          {renderActionButtons(
            order
          )}
        </LinearGradient>
      </View>
    );
  };

  /* =======================================================
     DATE FILTER LABEL
  ======================================================= */

  const getDateFilterLabel = (
    filter: DateFilter
  ) => {
    switch (filter) {
      case 'TODAY':
        return 'Today';

      case 'YESTERDAY':
        return 'Yesterday';

      case 'LAST_7_DAYS':
        return 'Last 7 Days';

      case 'LAST_30_DAYS':
        return 'Last 30 Days';

      case 'CUSTOM':
        return customDate
          ? formatDate(
              customDate
            )
          : 'Choose Date';

      case 'ALL':
      default:
        return 'All Dates';
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading &&
    !orders.length
  ) {
    return (
      <View
        style={
          screenStyles.centered
        }
      >
        <ActivityIndicator
          size="large"
          color="#DAA520"
        />
      </View>
    );
  }

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <View
      style={
        screenStyles.container
      }
    >
      <StatusBar
        barStyle="dark-content"
      />

      {/* ===================================================
          DATE FILTER
      ==================================================== */}

      <View
        style={{
          backgroundColor:
            '#FFFDF7',
          paddingTop: 10,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor:
            '#EFE7D8',
        }}
      >
        {/* DATE TITLE */}

        <View
          style={{
            flexDirection:
              'row',
            alignItems:
              'center',
            paddingHorizontal: 15,
            marginBottom: 8,
          }}
        >
          <FontAwesome
            name="calendar"
            size={15}
            color="#DAA520"
          />

          <Text
            style={{
              marginLeft: 7,
              fontSize: 14,
              fontWeight:
                '700',
              color:
                '#3B3021',
            }}
          >
            Order Date
          </Text>
        </View>

        {/* -----------------------------------------------
            WEB DATE INPUT
        ----------------------------------------------- */}

        {Platform.OS ===
          'web' && (
          <View
            style={{
              paddingHorizontal: 15,
              marginBottom: 10,
            }}
          >
            {React.createElement(
              'input',
              {
                type: 'date',

                value:
                  customDate
                    ? dateToInputValue(
                        customDate
                      )
                    : '',

                max:
                  dateToInputValue(
                    new Date()
                  ),

                onChange: (
                  event: any
                ) => {
                  handleWebDateChange(
                    event.target
                      .value
                  );
                },

                style: {
                  width:
                    '100%',
                  maxWidth:
                    320,
                  height:
                    42,
                  padding:
                    '0 12px',
                  borderRadius:
                    10,
                  border:
                    '1px solid #E6DCCD',
                  backgroundColor:
                    '#F5F0E7',
                  color:
                    '#3B3021',
                  fontSize:
                    14,
                  fontWeight:
                    600,
                  outline:
                    'none',
                  boxSizing:
                    'border-box',
                  cursor:
                    'pointer',
                },
              }
            )}
          </View>
        )}

        {/* -----------------------------------------------
            QUICK DATE FILTERS
        ----------------------------------------------- */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingHorizontal: 15,
            gap: 8,
          }}
        >
          {(
            [
              'ALL',
              'TODAY',
              'YESTERDAY',
              'LAST_7_DAYS',
              'LAST_30_DAYS',
              'CUSTOM',
            ] as DateFilter[]
          ).map(
            filter => {
              const selected =
                selectedDateFilter ===
                filter;

              return (
                <TouchableOpacity
                  key={
                    filter
                  }
                  onPress={() => {
                    if (
                      filter ===
                      'CUSTOM'
                    ) {
                      openCustomDatePicker();
                    } else {
                      setSelectedDateFilter(
                        filter
                      );
                    }
                  }}
                  activeOpacity={
                    0.8
                  }
                  style={{
                    flexDirection:
                      'row',
                    alignItems:
                      'center',
                    paddingHorizontal:
                      14,
                    paddingVertical:
                      9,
                    borderRadius:
                      20,
                    backgroundColor:
                      selected
                        ? '#DAA520'
                        : '#F5F0E7',
                    borderWidth:
                      1,
                    borderColor:
                      selected
                        ? '#DAA520'
                        : '#E6DCCD',
                  }}
                >
                  {filter ===
                    'CUSTOM' && (
                    <FontAwesome
                      name="calendar"
                      size={12}
                      color={
                        selected
                          ? '#fff'
                          : '#A89378'
                      }
                      style={{
                        marginRight:
                          6,
                      }}
                    />
                  )}

                  <Text
                    style={{
                      fontSize:
                        12,
                      fontWeight:
                        '600',
                      color:
                        selected
                          ? '#fff'
                          : '#6D6254',
                    }}
                  >
                    {getDateFilterLabel(
                      filter
                    )}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* ===================================================
          ANDROID / IOS DATE PICKER
          NEVER RENDER THIS ON WEB
      ==================================================== */}

      {showDatePicker &&
        Platform.OS !== 'web' && (
          <DateTimePicker
            value={
              customDate ||
              new Date()
            }
            mode="date"
            display={
              Platform.OS ===
              'ios'
                ? 'spinner'
                : 'default'
            }
            maximumDate={
              new Date()
            }
            onChange={
              handleNativeDateChange
            }
          />
        )}

      {/* ===================================================
          STATUS FILTER
      ==================================================== */}

      <View
        style={
          screenStyles.filterBarContainer
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingHorizontal: 15,
          }}
        >
          {[
            'ALL',
            'PLACED',
            'READY',
            'ACCEPTED',
            'DELIVERED',
            'FAILED',
            'CANCEL_PENDING',
            'CANCELLED',
            'REJECTED',
          ].map(
            filter => {
              let displayLabel =
                filter;

              if (
                filter ===
                'ALL'
              ) {
                displayLabel =
                  t.all ||
                  'ALL';
              } else if (
                filter ===
                'PLACED'
              ) {
                displayLabel =
                  t.placed ||
                  'PLACED';
              } else if (
                filter ===
                'READY'
              ) {
                displayLabel =
                  t.ready ||
                  'READY';
              } else if (
                filter ===
                'ACCEPTED'
              ) {
                displayLabel =
                  t.accepted ||
                  'ACCEPTED';
              } else if (
                filter ===
                'DELIVERED'
              ) {
                displayLabel =
                  t.delivered ||
                  'DELIVERED';
              } else if (
                filter ===
                'REJECTED'
              ) {
                displayLabel =
                  t.rejected ||
                  'REJECTED';
              } else if (
                filter ===
                'FAILED'
              ) {
                displayLabel =
                  t.statusFailed ||
                  'FAILED';
              } else if (
                filter ===
                'CANCEL_PENDING'
              ) {
                displayLabel =
                  t.cancelRequestedShort ||
                  'CANCEL REQ.';
              } else if (
                filter ===
                'CANCELLED'
              ) {
                displayLabel =
                  t.statusCancelled ||
                  'CANCELLED';
              }

              return (
                <TouchableOpacity
                  key={
                    filter
                  }
                  onPress={() =>
                    setSelectedFilter(
                      filter
                    )
                  }
                  style={[
                    screenStyles.filterTabButton,
                    selectedFilter ===
                      filter && {
                      backgroundColor:
                        '#DAA520',
                    },
                  ]}
                >
                  <Text
                    style={[
                      screenStyles.filterTabText,
                      {
                        color:
                          selectedFilter ===
                          filter
                            ? '#fff'
                            : '#666',
                      },
                    ]}
                  >
                    {
                      displayLabel
                    }
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* ===================================================
          ACTIVE FILTER SUMMARY
      ==================================================== */}

      {(
        selectedDateFilter !==
          'ALL' ||
        selectedFilter !==
          'ALL'
      ) && (
        <View
          style={{
            flexDirection:
              'row',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            paddingHorizontal:
              15,
            paddingVertical:
              8,
            backgroundColor:
              '#FFFCF4',
          }}
        >
          <View
            style={{
              flexDirection:
                'row',
              alignItems:
                'center',
            }}
          >
            <FontAwesome
              name="filter"
              size={11}
              color="#DAA520"
            />

            <Text
              style={{
                marginLeft:
                  6,
                color:
                  '#6D6254',
                fontSize:
                  12,
              }}
            >
              {filteredOrders.length}{' '}
              order
              {filteredOrders.length !==
              1
                ? 's'
                : ''}{' '}
              found
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setSelectedFilter(
                'ALL'
              );

              setSelectedDateFilter(
                'ALL'
              );

              setCustomDate(
                null
              );

              setShowDatePicker(
                false
              );
            }}
          >
            <Text
              style={{
                color:
                  '#B8860B',
                fontSize:
                  12,
                fontWeight:
                  '700',
              }}
            >
              Clear Filters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===================================================
          ORDERS
      ==================================================== */}

      <FlatList
        data={
          filteredOrders
        }
        renderItem={
          renderOrderItem
        }
        keyExtractor={
          item =>
            item._id
        }
        contentContainerStyle={{
          padding: 15,
          paddingBottom:
            40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={
              isLoading
            }
            onRefresh={
              refetch
            }
            tintColor="#DAA520"
          />
        }
        ListEmptyComponent={
          <View
            style={
              screenStyles.emptyContainer
            }
          >
            <FontAwesome
              name="calendar-o"
              size={50}
              color="#ddd"
            />

            <Text
              style={
                screenStyles.emptyText
              }
            >
              {selectedDateFilter !==
              'ALL'
                ? 'No orders found for this date'
                : t.noOrdersFound ||
                  'No orders found'}
            </Text>

            {selectedDateFilter !==
              'ALL' && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDateFilter(
                    'ALL'
                  );

                  setCustomDate(
                    null
                  );

                  setShowDatePicker(
                    false
                  );
                }}
                style={{
                  marginTop:
                    12,
                  paddingHorizontal:
                    18,
                  paddingVertical:
                    9,
                  borderRadius:
                    18,
                  backgroundColor:
                    '#F5F0E7',
                }}
              >
                <Text
                  style={{
                    color:
                      '#B8860B',
                    fontWeight:
                      '600',
                    fontSize:
                      12,
                  }}
                >
                  Show All Orders
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}