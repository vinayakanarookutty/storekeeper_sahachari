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

import { useLanguage } from '../contexts/LanguageContext';
import { screenStyles } from '../tab_style/three.style';
import {
  fetchStoreBookings,
  updateBookingStatus,
} from '../services/bookingsApi';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

// =========================================================
// BOOKING WORKFLOW
// =========================================================

const BOOKING_STEPS = [
  'PLACED',
  'ACCEPTED',
  'COMPLETED',
];

const STEP_ICON_CONFIG: Record<
  string,
  {
    icon: string;
    translationKey: string;
    defaultLabel: string;
  }
> = {
  PLACED: {
    icon: 'calendar-plus-o',
    translationKey: 'statusPlaced',
    defaultLabel: 'Booked',
  },

  ACCEPTED: {
    icon: 'thumbs-up',
    translationKey: 'statusAccepted',
    defaultLabel: 'Accepted',
  },

  COMPLETED: {
    icon: 'check-circle',
    translationKey: 'delivered',
    defaultLabel: 'Completed',
  },
};

// =========================================================
// STATUS CONFIG
// =========================================================

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
    icon: 'calendar-plus-o',
    translationKey: 'statusPlaced',
    defaultLabel: 'Booking Placed',
  },

  ACCEPTED: {
    color: '#2E7D32',
    icon: 'check-circle',
    translationKey: 'statusAccepted',
    defaultLabel: 'Accepted',
  },

  IN_PROGRESS: {
    color: '#0288D1',
    icon: 'spinner',
    translationKey: 'statusInProgress',
    defaultLabel: 'In Progress',
  },

  COMPLETED: {
    color: '#4CAF50',
    icon: 'check-circle',
    translationKey: 'statusCompleted',
    defaultLabel: 'Completed',
  },

  RETURNED: {
    color: '#7B1FA2',
    icon: 'reply',
    translationKey: 'statusReturned',
    defaultLabel: 'Returned',
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

  CANCELLED: {
    color: '#D32F2F',
    icon: 'ban',
    translationKey: 'statusCancelled',
    defaultLabel: 'Cancelled',
  },
};

// =========================================================
// DATE FILTER TYPE
// =========================================================

type DateFilter =
  | 'ALL'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'NEXT_30_DAYS'
  | 'CUSTOM';

// =========================================================
// MAIN SCREEN
// =========================================================

export default function BookingsScreen() {
  const { t, language } = useLanguage();

  const queryClient = useQueryClient();

  // =======================================================
  // STATE
  // =======================================================

  const [selectedFilter, setSelectedFilter] =
    useState('ALL');

  const [selectedDateFilter, setSelectedDateFilter] =
    useState<DateFilter>('ALL');

  const [customDate, setCustomDate] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [expandedBookings, setExpandedBookings] =
    useState<Record<string, boolean>>({});

  // =======================================================
  // ALERT HELPERS
  // =======================================================

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
    } else {
      Alert.alert(title, message, [
        {
          text: t.cancel || 'Cancel',
          style: 'cancel',
        },
        {
          text:
            t.confirmTitle ||
            'Confirm',
          onPress: onConfirm,
        },
      ]);
    }
  };

  const showAlert = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // =======================================================
  // FETCH BOOKINGS
  // =======================================================

  const {
    data: bookings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['storeBookingsList'],

    queryFn: async () => {
      return await fetchStoreBookings();
    },

    refetchInterval: 30000,
  });

  // =======================================================
  // DATE HELPERS
  // =======================================================

  const startOfDay = (date: Date) => {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    return result;
  };

  const endOfDay = (date: Date) => {
    const result = new Date(date);

    result.setHours(
      23,
      59,
      59,
      999
    );

    return result;
  };

  const isSameDay = (
    first: Date,
    second: Date
  ) => {
    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    );
  };

  // =======================================================
  // GET BOOKING DATE
  //
  // startDate = actual service/rental date
  // createdAt  = fallback
  // =======================================================

  const getBookingDate = (
    booking: any
  ): Date | null => {
    const rawDate =
      booking.startDate ||
      booking.createdAt;

    if (!rawDate) {
      return null;
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  };

  // =======================================================
  // CHECK DATE FILTER
  // =======================================================

  const isBookingInDateFilter = (
    bookingDate: Date
  ) => {
    const today = new Date();

    switch (selectedDateFilter) {
      case 'ALL':
        return true;

      case 'TODAY':
        return isSameDay(
          bookingDate,
          today
        );

      case 'TOMORROW': {
        const tomorrow =
          new Date(today);

        tomorrow.setDate(
          tomorrow.getDate() + 1
        );

        return isSameDay(
          bookingDate,
          tomorrow
        );
      }

      case 'THIS_WEEK': {
        const todayStart =
          startOfDay(today);

        const day =
          todayStart.getDay();

        // Monday = beginning of week
        const diff =
          day === 0 ? 6 : day - 1;

        const weekStart =
          new Date(todayStart);

        weekStart.setDate(
          weekStart.getDate() - diff
        );

        const weekEnd =
          new Date(weekStart);

        weekEnd.setDate(
          weekEnd.getDate() + 6
        );

        return (
          bookingDate >=
            weekStart &&
          bookingDate <=
            endOfDay(weekEnd)
        );
      }

      case 'NEXT_30_DAYS': {
        const todayStart =
          startOfDay(today);

        const next30 =
          new Date(todayStart);

        next30.setDate(
          next30.getDate() + 30
        );

        return (
          bookingDate >=
            todayStart &&
          bookingDate <=
            endOfDay(next30)
        );
      }

      case 'CUSTOM':
        if (!customDate) {
          return true;
        }

        return isSameDay(
          bookingDate,
          customDate
        );

      default:
        return true;
    }
  };

  // =======================================================
  // FILTER + SORT BOOKINGS
  // =======================================================

  const filteredBookings = useMemo(() => {
    if (
      !bookings ||
      !Array.isArray(bookings)
    ) {
      return [];
    }

    const result =
      bookings.filter(
        (booking: any) => {
          // Status filter
          const statusMatches =
            selectedFilter ===
              'ALL' ||
            booking.status ===
              selectedFilter;

          if (!statusMatches) {
            return false;
          }

          // Date filter
          const bookingDate =
            getBookingDate(
              booking
            );

          if (!bookingDate) {
            return (
              selectedDateFilter ===
              'ALL'
            );
          }

          return isBookingInDateFilter(
            bookingDate
          );
        }
      );

    // Newest / nearest booking date first
    return [...result].sort(
      (a: any, b: any) => {
        const dateA =
          getBookingDate(a);

        const dateB =
          getBookingDate(b);

        if (!dateA && !dateB) {
          return 0;
        }

        if (!dateA) {
          return 1;
        }

        if (!dateB) {
          return -1;
        }

        return (
          dateB.getTime() -
          dateA.getTime()
        );
      }
    );
  }, [
    bookings,
    selectedFilter,
    selectedDateFilter,
    customDate,
  ]);

  // =======================================================
  // DATE PICKER
  // =======================================================

  const handleDateChange = (
    event: any,
    selected?: Date
  ) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (
      event?.type ===
      'dismissed'
    ) {
      return;
    }

    if (selected) {
      setCustomDate(selected);

      setSelectedDateFilter(
        'CUSTOM'
      );
    }
  };

  const openCustomDatePicker = () => {
    setShowDatePicker(true);
  };

  // =======================================================
  // WEB DATE VALUE
  // =======================================================

  const getWebDateValue = () => {
    if (!customDate) {
      return '';
    }

    const year =
      customDate.getFullYear();

    const month = String(
      customDate.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      customDate.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =======================================================
  // WEB DATE CHANGE
  // =======================================================

  const handleWebDateChange = (
    event: any
  ) => {
    const value =
      event.target.value;

    if (!value) {
      return;
    }

    const [
      year,
      month,
      day,
    ] = value
      .split('-')
      .map(Number);

    const selected =
      new Date(
        year,
        month - 1,
        day
      );

    setCustomDate(selected);

    setSelectedDateFilter(
      'CUSTOM'
    );

    setShowDatePicker(false);
  };

  // =======================================================
  // FORMAT DATE
  // =======================================================

  const formatDate = (
    date: Date
  ) => {
    return date.toLocaleDateString(
      language === 'ml'
        ? 'ml-IN'
        : 'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =======================================================
  // DATE FILTER LABEL
  // =======================================================

  const getDateFilterLabel = (
    filter: DateFilter
  ) => {
    switch (filter) {
      case 'ALL':
        return language === 'ml'
          ? 'എല്ലാ തീയതികളും'
          : 'All Dates';

      case 'TODAY':
        return language === 'ml'
          ? 'ഇന്ന്'
          : 'Today';

      case 'TOMORROW':
        return language === 'ml'
          ? 'നാളെ'
          : 'Tomorrow';

      case 'THIS_WEEK':
        return language === 'ml'
          ? 'ഈ ആഴ്ച'
          : 'This Week';

      case 'NEXT_30_DAYS':
        return language === 'ml'
          ? 'അടുത്ത 30 ദിവസം'
          : 'Next 30 Days';

      case 'CUSTOM':
        return customDate
          ? formatDate(
              customDate
            )
          : language === 'ml'
          ? 'തീയതി തിരഞ്ഞെടുക്കുക'
          : 'Choose Date';

      default:
        return 'All Dates';
    }
  };

  // =======================================================
  // STATUS MUTATION
  // =======================================================

  const updateStatusMutation =
    useMutation({
      mutationFn: async ({
        bookingId,
        nextStatus,
      }: {
        bookingId: string;
        nextStatus: any;
      }) => {
        return await updateBookingStatus(
          bookingId,
          nextStatus
        );
      },

      onSuccess: () => {
        queryClient.invalidateQueries(
          {
            queryKey: [
              'storeBookingsList',
            ],
          }
        );

        showAlert(
          t.successTitle ||
            'Success',
          t.statusUpdatedSuccess ||
            'Booking status updated successfully'
        );
      },

      onError: (
        error: any
      ) => {
        showAlert(
          t.failedTitle ||
            'Action Failed',
          error.message ||
            'Could not transform state'
        );
      },
    });

  // =======================================================
  // HANDLE ACTION
  // =======================================================

  const handleAction = (
    bookingId: string,
    nextStatus: string,
    confirmationMsg: string
  ) => {
    showConfirmation(
      t.confirmTitle ||
        'Confirm',
      confirmationMsg,
      () =>
        updateStatusMutation.mutate(
          {
            bookingId,
            nextStatus,
          }
        )
    );
  };

  // =======================================================
  // EXPAND BOOKING
  // =======================================================

  const toggleExpand = (
    bookingId: string
  ) => {
    if (
      Platform.OS !== 'web'
    ) {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets
          .easeInEaseOut
      );
    }

    setExpandedBookings(
      prev => ({
        ...prev,
        [bookingId]:
          !prev[bookingId],
      })
    );
  };

  // =======================================================
  // ACTION BUTTONS
  // =======================================================

  const renderActionButtons = (
    booking: any
  ) => {
    const isService =
      booking.bookingType ===
      'SERVICE';

    if (
      !booking.status ||
      [
        'COMPLETED',
        'RETURNED',
        'CANCELLED',
        'REJECTED',
        'FAILED',
      ].includes(
        booking.status
      )
    ) {
      return null;
    }

    const anyPending =
      updateStatusMutation.isPending;

    const isThisBookingPending =
      anyPending &&
      updateStatusMutation
        .variables
        ?.bookingId ===
        booking._id;

    const pendingStatus =
      isThisBookingPending
        ? updateStatusMutation
            .variables
            ?.nextStatus
        : null;

    return (
      <View
        style={
          screenStyles.actionsContainer
        }
      >
        {/* PLACED */}

        {booking.status ===
          'PLACED' && (
          <>
            <TouchableOpacity
              style={{
                flex: 2,
              }}
              disabled={anyPending}
              onPress={() =>
                handleAction(
                  booking._id,
                  'ACCEPTED',
                  t.confirmAcceptOrder ||
                    'Do you want to Accept this booking?'
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
                {pendingStatus ===
                'ACCEPTED' ? (
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
                    {t.accept ||
                      'ACCEPT'}
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
                  booking._id,
                  'REJECTED',
                  t.confirmRejectOrder ||
                    'Do you want to Reject this booking?'
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
                {pendingStatus ===
                'REJECTED' ? (
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

        {/* ACCEPTED */}

        {booking.status ===
          'ACCEPTED' && (
          <TouchableOpacity
            style={{
              flex: 1,
            }}
            disabled={anyPending}
            onPress={() =>
              handleAction(
                booking._id,
                isService
                  ? 'IN_PROGRESS'
                  : 'COMPLETED',
                isService
                  ? 'Move this service into In-Progress status?'
                  : t.confirmCompleteOrder ||
                      'Do you want to Complete this rental?'
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
              {pendingStatus ===
              (isService
                ? 'IN_PROGRESS'
                : 'COMPLETED') ? (
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
                  {isService
                    ? 'START SERVICE'
                    : t.completeDeliver ||
                      'COMPLETE'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* IN PROGRESS */}

        {booking.status ===
          'IN_PROGRESS' &&
          isService && (
            <TouchableOpacity
              style={{
                flex: 1,
              }}
              disabled={anyPending}
              onPress={() =>
                handleAction(
                  booking._id,
                  'COMPLETED',
                  t.confirmCompleteOrder ||
                    'Mark this active service as Completed?'
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
                {pendingStatus ===
                'COMPLETED' ? (
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
                      'COMPLETE'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  // =======================================================
  // RENDER BOOKING
  // =======================================================

  const renderBookingItem = ({
    item: booking,
  }: {
    item: any;
  }) => {
    let trackingStatus =
      booking.status ||
      'PLACED';

    if (
      trackingStatus ===
      'IN_PROGRESS'
    ) {
      trackingStatus =
        'ACCEPTED';
    }

    const currentStep =
      BOOKING_STEPS.indexOf(
        trackingStatus
      );

    const isExpanded =
      expandedBookings[
        booking._id
      ];

    const statusInfo =
      STATUS_CONFIG[
        booking.status
      ] ||
      STATUS_CONFIG.PLACED;

    const address =
      booking.bookingAddress ||
      {};

    const itemSnapshot =
      booking.item || {};

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
          {/* HEADER */}

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
              <Text
                style={
                  screenStyles.orderIdLabel
                }
              >
                {t.refLabel ||
                  'REF'}
                : #
                {booking._id
                  ?.substring(
                    0,
                    8
                  )
                  .toUpperCase()}
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

          {/* BOOKING DATE */}

          <View
            style={{
              flexDirection:
                'row',
              alignItems:
                'center',
              marginBottom: 12,
              gap: 6,
            }}
          >
            <FontAwesome
              name="calendar"
              size={13}
              color="#A89378"
            />

            <Text
              style={
                screenStyles.dateText
              }
            >
              {booking.startDate
                ? booking.bookingType ===
                    'RENTAL' &&
                  booking.endDate
                  ? `Rental Period: ${formatDate(
                      new Date(
                        booking.startDate
                      )
                    )} - ${formatDate(
                      new Date(
                        booking.endDate
                      )
                    )}`
                  : `Service Date: ${formatDate(
                      new Date(
                        booking.startDate
                      )
                    )}`
                : booking.createdAt
                ? `Created: ${formatDate(
                    new Date(
                      booking.createdAt
                    )
                  )}`
                : 'Recent Booking'}
            </Text>
          </View>

          {/* CUSTOMER CARD */}

          <View
            style={
              screenStyles.customerCard
            }
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
                {(() => {
                  const nameToDisplay =
                    booking.userName ||
                    (typeof booking.userId ===
                      'object' &&
                    booking.userId?.name) ||
                    address.name ||
                    (address.phone
                      ? `Customer (${address.phone.slice(
                          -4
                        )})`
                      : t.unknownUser ||
                        'Customer Account');

                  const avatarLetter =
                    nameToDisplay
                      .charAt(0)
                      .toUpperCase();

                  return (
                    <>
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
                          {
                            avatarLetter
                          }
                        </Text>
                      </View>

                      <View>
                        <Text
                          style={
                            screenStyles.customerNameMain
                          }
                        >
                          {
                            nameToDisplay
                          }
                        </Text>

                        {address.phone && (
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight:
                                '700',
                              color:
                                '#1E40AF',
                              marginTop:
                                2,
                            }}
                          >
                            <FontAwesome
                              name="phone"
                              size={12}
                              color="#1E40AF"
                            />{' '}
                            Phone:{' '}
                            {
                              address.phone
                            }
                          </Text>
                        )}
                      </View>
                    </>
                  );
                })()}
              </View>
            </View>

            <View
              style={[
                screenStyles.expandedDetails,
                {
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor:
                    '#E2E8F0',
                },
              ]}
            >
              {(address.street ||
                address.city ||
                address.place) && (
                <Text
                  style={{
                    fontSize: 13,
                    color:
                      '#334155',
                    marginVertical:
                      2,
                    fontWeight:
                      '500',
                  }}
                >
                  <FontAwesome
                    name="map-marker"
                    size={13}
                    color="#DC2626"
                  />{' '}
                  Address:{' '}
                  {[
                    address.street,
                    address.city,
                    address.place,
                    address.zipCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}

              {address.notes && (
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      '#64748B',
                    fontStyle:
                      'italic',
                    marginVertical:
                      2,
                  }}
                >
                  <FontAwesome
                    name="info-circle"
                    size={12}
                    color="#0288D1"
                  />{' '}
                  Notes:{' '}
                  {address.notes}
                </Text>
              )}

              <Text
                style={{
                  fontSize: 12,
                  color:
                    '#475569',
                  marginVertical:
                    2,
                }}
              >
                <FontAwesome
                  name="credit-card"
                  size={12}
                  color="#475569"
                />{' '}
                Payment:{' '}
                {
                  booking.paymentMethod
                }{' '}
                (
                {
                  booking.paymentStatus
                }
                )
              </Text>
            </View>
          </View>

          {/* STEPPER */}

          {![
            'CANCELLED',
            'REJECTED',
            'FAILED',
            'RETURNED',
          ].includes(
            booking.status
          ) && (
            <View
              style={
                screenStyles.progressContainer
              }
            >
              {BOOKING_STEPS.map(
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

          {/* ITEM */}

          <View
            style={[
              screenStyles.itemRowImproved,
              {
                flexDirection:
                  'column',
                alignItems:
                  'stretch',
              },
            ]}
          >
            <View
              style={{
                flexDirection:
                  'row',
                alignItems:
                  'center',
              }}
            >
              {itemSnapshot.images &&
              itemSnapshot
                .images.length >
                0 ? (
                <Image
                  source={{
                    uri: itemSnapshot
                      .images[0]
                      .startsWith(
                        'http'
                      )
                      ? itemSnapshot
                          .images[0]
                      : `${S3_BASE_URL}/${itemSnapshot.images[0]}`,
                  }}
                  style={
                    screenStyles.itemImageSmall
                  }
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
                    size={16}
                    color="#A89378"
                  />
                </View>
              )}

              <View
                style={[
                  screenStyles.itemInfo,
                  {
                    flex: 1,
                  },
                ]}
              >
                <Text
                  style={
                    screenStyles.itemNameSmall
                  }
                >
                  {itemSnapshot.itemName ||
                    'Booking Listing'}
                </Text>

                <Text
                  style={
                    screenStyles.itemCatSmall
                  }
                >
                  Category:{' '}
                  {
                    itemSnapshot.category
                  }{' '}
                  • Unit:{' '}
                  {itemSnapshot.unit ||
                    'N/A'}{' '}
                  • Qty:{' '}
                  {
                    itemSnapshot.quantity
                  }
                </Text>
              </View>

              <Text
                style={
                  screenStyles.itemPriceSmall
                }
              >
                ₹
                {
                  itemSnapshot.price
                }
              </Text>
            </View>

            {itemSnapshot.description && (
              <Text
                style={{
                  fontSize: 12,
                  color:
                    '#64748B',
                  marginTop: 6,
                  paddingTop: 4,
                  borderTopWidth:
                    0.5,
                  borderTopColor:
                    '#CBD5E1',
                }}
              >
                Description:{' '}
                {
                  itemSnapshot.description
                }
              </Text>
            )}
          </View>

          {/* BOOKING PERIOD */}

          {booking.startDate && (
            <View
              style={{
                flexDirection:
                  'row',
                alignItems:
                  'center',
                backgroundColor:
                  '#F3E5F5',
                padding: 8,
                borderRadius: 8,
                marginVertical: 6,
              }}
            >
              <FontAwesome
                name="calendar"
                size={13}
                color="#7B1FA2"
                style={{
                  marginRight: 6,
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  fontWeight:
                    '600',
                  color:
                    '#7B1FA2',
                }}
              >
                {booking.bookingType ===
                  'RENTAL' &&
                booking.endDate
                  ? `Rental Period: ${formatDate(
                      new Date(
                        booking.startDate
                      )
                    )} to ${formatDate(
                      new Date(
                        booking.endDate
                      )
                    )}`
                  : `Service Date: ${formatDate(
                      new Date(
                        booking.startDate
                      )
                    )}`}
              </Text>
            </View>
          )}

          {/* TOTAL */}

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
                'Total Value'}
            </Text>

            <Text
              style={
                screenStyles.totalValue
              }
            >
              ₹
              {booking.totalAmount ||
                '0'}
            </Text>
          </View>

          {/* ACTIONS */}

          {renderActionButtons(
            booking
          )}
        </LinearGradient>
      </View>
    );
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (
    isLoading &&
    !bookings.length
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

  // =======================================================
  // SCREEN
  // =======================================================

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
          paddingBottom: 9,
          borderBottomWidth: 1,
          borderBottomColor:
            '#EFE7D8',
        }}
      >
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
            {language === 'ml'
              ? 'ബുക്കിംഗ് തീയതി'
              : 'Booking Date'}
          </Text>
        </View>

        {/* DATE FILTER BUTTONS */}

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
              'TOMORROW',
              'THIS_WEEK',
              'NEXT_30_DAYS',
              'CUSTOM',
            ] as DateFilter[]
          ).map(
            filter => {
              const selected =
                selectedDateFilter ===
                filter;

              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={
                    0.8
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
                        marginRight: 6,
                      }}
                    />
                  )}

                  <Text
                    style={{
                      fontSize: 12,
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

        {/* =================================================
            WEB DATE PICKER
            HTML INPUT ONLY ON WEB
        ================================================= */}

        {Platform.OS ===
          'web' &&
          showDatePicker && (
            <View
              style={{
                paddingHorizontal: 15,
                paddingTop: 10,
                paddingBottom: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight:
                    '600',
                  color:
                    '#6D6254',
                  marginBottom: 5,
                }}
              >
                {language ===
                'ml'
                  ? 'തീയതി തിരഞ്ഞെടുക്കുക'
                  : 'Select Date'}
              </Text>

              <input
                type="date"
                value={getWebDateValue()}
                onChange={
                  handleWebDateChange
                }
                style={{
                  width:
                    '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '10px 12px',
                  borderRadius:
                    8,
                  border:
                    '1px solid #E6DCCD',
                  backgroundColor:
                    '#FFFFFF',
                  fontSize:
                    14,
                  color:
                    '#3B3021',
                  outline:
                    'none',
                }}
              />
            </View>
          )}
      </View>

      {/* ===================================================
          NATIVE DATE PICKER
          ANDROID / IOS ONLY
      ==================================================== */}

      {showDatePicker &&
        Platform.OS !==
          'web' && (
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
            onChange={
              handleDateChange
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
            'ACCEPTED',
            'IN_PROGRESS',
            'COMPLETED',
            'RETURNED',
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
                  language ===
                  'ml'
                    ? 'ബുക്ക് ചെയ്തവ'
                    : 'PLACED';
              } else if (
                filter ===
                'ACCEPTED'
              ) {
                displayLabel =
                  t.accepted ||
                  'ACCEPTED';
              } else if (
                filter ===
                'IN_PROGRESS'
              ) {
                displayLabel =
                  language ===
                  'ml'
                    ? 'പുരോഗതിയിൽ'
                    : 'IN PROGRESS';
              } else if (
                filter ===
                'COMPLETED'
              ) {
                displayLabel =
                  language ===
                  'ml'
                    ? 'പൂർത്തിയായവ'
                    : 'COMPLETED';
              } else if (
                filter ===
                'RETURNED'
              ) {
                displayLabel =
                  language ===
                  'ml'
                    ? 'തിരികെ ലഭിച്ചത്'
                    : 'RETURNED';
              } else if (
                filter ===
                'REJECTED'
              ) {
                displayLabel =
                  t.rejected ||
                  'REJECTED';
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
                  key={filter}
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

      {(selectedDateFilter !==
        'ALL' ||
        selectedFilter !==
          'ALL') && (
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
                marginLeft: 6,
                color:
                  '#6D6254',
                fontSize: 12,
              }}
            >
              {
                filteredBookings.length
              }{' '}
              {language ===
              'ml'
                ? 'ബുക്കിംഗുകൾ കണ്ടെത്തി'
                : filteredBookings.length ===
                  1
                ? 'booking found'
                : 'bookings found'}
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
                fontSize: 12,
                fontWeight:
                  '700',
              }}
            >
              {language ===
              'ml'
                ? 'ഫിൽട്ടറുകൾ നീക്കം ചെയ്യുക'
                : 'Clear Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===================================================
          BOOKINGS LIST
      ==================================================== */}

      <FlatList
        data={
          filteredBookings
        }
        renderItem={
          renderBookingItem
        }
        keyExtractor={item =>
          item._id
        }
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 40,
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
              name="calendar-times-o"
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
                ? language ===
                  'ml'
                  ? 'ഈ തീയതിയിൽ ബുക്കിംഗുകൾ ഒന്നും കണ്ടെത്തിയില്ല'
                  : 'No bookings found for this date'
                : language ===
                  'ml'
                ? 'ബുക്കിംഗുകൾ ഒന്നും കണ്ടെത്തിയില്ല'
                : 'No bookings found'}
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
                  marginTop: 12,
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
                    fontSize: 12,
                  }}
                >
                  {language ===
                  'ml'
                    ? 'എല്ലാ ബുക്കിംഗുകളും കാണിക്കുക'
                    : 'Show All Bookings'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}