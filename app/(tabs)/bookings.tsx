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
import { useLanguage } from '../contexts/LanguageContext';
import { screenStyles } from '../tab_style/three.style';
import { fetchStoreBookings, updateBookingStatus } from '../services/bookingsApi';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

// Workflow tracker mapping the critical operational stages
const BOOKING_STEPS = ['PLACED', 'ACCEPTED', 'COMPLETED'];

const STEP_ICON_CONFIG: Record<string, { icon: string; translationKey: string; defaultLabel: string }> = {
  PLACED: { icon: 'calendar-plus-o', translationKey: 'statusPlaced', defaultLabel: 'Booked' },
  ACCEPTED: { icon: 'thumbs-up', translationKey: 'statusAccepted', defaultLabel: 'Accepted' },
  COMPLETED: { icon: 'check-circle', translationKey: 'delivered', defaultLabel: 'Completed' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: string; translationKey: string; defaultLabel: string }> = {
  PLACED: { color: '#DAA520', icon: 'calendar-plus-o', translationKey: 'statusPlaced', defaultLabel: 'Booking Placed' },
  ACCEPTED: { color: '#2E7D32', icon: 'check-circle', translationKey: 'statusAccepted', defaultLabel: 'Accepted' },
  IN_PROGRESS: { color: '#0288D1', icon: 'spinner', translationKey: 'statusInProgress', defaultLabel: 'In Progress' },
  COMPLETED: { color: '#4CAF50', icon: 'check-circle', translationKey: 'statusCompleted', defaultLabel: 'Completed' },
  RETURNED: { color: '#7B1FA2', icon: 'reply', translationKey: 'statusReturned', defaultLabel: 'Returned' },
  REJECTED: { color: '#D32F2F', icon: 'times-circle', translationKey: 'statusRejected', defaultLabel: 'Rejected' }, 
  FAILED: { color: '#757575', icon: 'exclamation-triangle', translationKey: 'statusFailed', defaultLabel: 'Failed' },
  CANCELLED: { color: '#D32F2F', icon: 'ban', translationKey: 'statusCancelled', defaultLabel: 'Cancelled' },
};

export default function BookingsScreen() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});

  // Confirm Actions Helpers
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

  // 1. Fetching booking records explicitly from your backend bookings API layer
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['storeBookingsList'],
    queryFn: async () => {
      return await fetchStoreBookings();
    },
    refetchInterval: 30000, 
  });

  // 2. Filtration Logic Row
  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    if (selectedFilter === 'ALL') return bookings;
    return bookings.filter((b: any) => b.status === selectedFilter);
  }, [bookings, selectedFilter]);

  // 3. Status Action Mutations targeting NestJS controller pipelines
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, nextStatus }: { bookingId: string; nextStatus: any }) => {
      return await updateBookingStatus(bookingId, nextStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeBookingsList'] });
      showAlert(t.successTitle || 'Success', t.statusUpdatedSuccess || 'Booking status updated successfully');
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Action Failed', error.message || 'Could not transform state');
    }
  });

  const handleAction = (bookingId: string, nextStatus: string, confirmationMsg: string) => {
    showConfirmation(
      t.confirmTitle || 'Confirm', 
      confirmationMsg, 
      () => updateStatusMutation.mutate({ bookingId, nextStatus })
    );
  };

  const toggleExpand = (bookingId: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedBookings(prev => ({ ...prev, [bookingId]: !prev[bookingId] }));
  };

  const renderActionButtons = (booking: any) => {
    const isService = booking.bookingType === 'SERVICE';
    
    if (!booking.status || ['COMPLETED', 'RETURNED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(booking.status)) return null;

    return (
      <View style={screenStyles.actionsContainer}>
        {booking.status === 'PLACED' && (
          <>
            <TouchableOpacity 
              style={{ flex: 2 }} 
              onPress={() => handleAction(
                booking._id, 
                'ACCEPTED', 
                t.confirmAcceptOrder || 'Do you want to Accept this booking?'
              )}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>
                  {t.accept || 'ACCEPT'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1 }} 
              onPress={() => handleAction(
                booking._id, 
                'REJECTED', 
                t.confirmRejectOrder || 'Do you want to Reject this booking?'
              )}
            >
              <LinearGradient colors={['#F44336', '#D32F2F']} style={screenStyles.actionButtonGradient}>
                <Text style={screenStyles.actionButtonText}>{t.reject || 'REJECT'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {booking.status === 'ACCEPTED' && (
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => handleAction(
              booking._id, 
              isService ? 'IN_PROGRESS' : 'COMPLETED', 
              isService ? 'Move this service into In-Progress status?' : t.confirmCompleteOrder || 'Do you want to Complete this rental?'
            )}
          >
            <LinearGradient colors={['#2196F3', '#1976D2']} style={screenStyles.actionButtonGradient}>
              <Text style={screenStyles.actionButtonText}>
                {isService ? 'START SERVICE' : t.completeDeliver || 'COMPLETE'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {booking.status === 'IN_PROGRESS' && isService && (
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => handleAction(
              booking._id, 
              'COMPLETED', 
              t.confirmCompleteOrder || 'Mark this active service as Completed?'
            )}
          >
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={screenStyles.actionButtonGradient}>
              <Text style={screenStyles.actionButtonText}>{t.completeDeliver || 'COMPLETE'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBookingItem = ({ item: booking }: { item: any }) => {
    // Treat IN_PROGRESS visually as part of the operational processing stage
    let trackingStatus = booking.status || 'PLACED';
    if (trackingStatus === 'IN_PROGRESS') trackingStatus = 'ACCEPTED';
    
    const currentStep = BOOKING_STEPS.indexOf(trackingStatus);
    const isExpanded = expandedBookings[booking._id];
    
    const statusInfo = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PLACED;
    const address = booking.bookingAddress || {};
    const itemSnapshot = booking.item || {};

    return (
      <View style={screenStyles.orderCard}>
        <LinearGradient colors={['#FFFFFF', '#FDFBF0']} style={screenStyles.orderCardGradient}>
          
          {/* Header ID details */}
          <View style={screenStyles.orderHeader}>
            <View style={screenStyles.headerLeftRef}>
              <Text style={screenStyles.orderIdLabel}>
                {(t.refLabel || 'REF')}: #{booking._id?.substring(0, 8).toUpperCase()}
              </Text>
            </View>
            
            <View style={[screenStyles.statusBadge, { backgroundColor: statusInfo.color + '12', borderColor: statusInfo.color }]}>
              <FontAwesome name={statusInfo.icon as any} size={11} color={statusInfo.color} />
              <Text style={[screenStyles.statusBadgeText, { color: statusInfo.color }]}>
                {(t as any)[statusInfo.translationKey] || statusInfo.defaultLabel}
              </Text>
            </View>
          </View>

          <Text style={screenStyles.dateText}>
            {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'Recent Booking'}
          </Text>

          {/* Customer Metadata Card */}
          <TouchableOpacity onPress={() => toggleExpand(booking._id)} style={screenStyles.customerCard}>
            <View style={screenStyles.customerRow}>
                <View style={screenStyles.customerMainLeft}>
                  <View style={screenStyles.avatarCircle}>
                    <Text style={screenStyles.avatarText}>{booking.userId?.name?.charAt(0) || 'U'}</Text>
                  </View>
                  <Text style={screenStyles.customerNameMain}>
                    {booking.userId?.name || (t.unknownUser || 'Customer Account')}
                  </Text>
                </View>
                <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color="#AAA" />
            </View>
            {isExpanded && (
              <View style={screenStyles.expandedDetails}>
                {address.phone && <Text style={screenStyles.detailText}><FontAwesome name="phone" /> {address.phone}</Text>}
                {address.street && <Text style={screenStyles.detailText}><FontAwesome name="map-marker" /> {address.street}, {address.city}, {address.place}</Text>}
                {address.notes && <Text style={screenStyles.detailText}><FontAwesome name="info-circle" /> {address.notes}</Text>}
                <Text style={screenStyles.detailText}><FontAwesome name="credit-card" /> Mode: {booking.paymentMethod} ({booking.paymentStatus})</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Milestone Stepper Map Tracker */}
          {!['CANCELLED', 'REJECTED', 'FAILED', 'RETURNED'].includes(booking.status) && (
            <View style={screenStyles.progressContainer}>
              {BOOKING_STEPS.map((step, index) => {
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

          {/* Individual Snapshot Item Data Blocks */}
          <View style={screenStyles.itemRowImproved}>
            {itemSnapshot.images && itemSnapshot.images.length > 0 ? (
              <Image 
                source={{ uri: itemSnapshot.images[0].startsWith('http') ? itemSnapshot.images[0] : `${S3_BASE_URL}/${itemSnapshot.images[0]}` }} 
                style={screenStyles.itemImageSmall} 
              />
            ) : (
              <View style={[screenStyles.itemImageSmall, { backgroundColor: '#F0EFEA', justifyContent: 'center', alignItems: 'center' }]}>
                <FontAwesome name="cube" size={16} color="#A89378" />
              </View>
            )}
            <View style={screenStyles.itemInfo}>
              <Text style={screenStyles.itemNameSmall} numberOfLines={1}>{itemSnapshot.itemName || 'Booking Listing'}</Text>
              <Text style={screenStyles.itemCatSmall}>
                {itemSnapshot.category} • {(t.qtyLabel || 'Qty')}: {itemSnapshot.quantity}
              </Text>
            </View>
            <Text style={screenStyles.itemPriceSmall}>₹{itemSnapshot.price}</Text>
          </View>

          <View style={screenStyles.totalRow}>
            <Text style={screenStyles.totalLabel}>{t.grandTotal || 'Total Value'}</Text>
            <Text style={screenStyles.totalValue}>₹{booking.totalAmount || '0'}</Text>
          </View>

          {renderActionButtons(booking)}
        </LinearGradient>
      </View>
    );
  };

  if (isLoading && !bookings.length) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Filters ScrollBar View */}
      <View style={screenStyles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['ALL', 'PLACED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'CANCELLED', 'REJECTED'].map((filter) => {
             let displayLabel = filter;
             if (filter === 'ALL') displayLabel = t.all || 'ALL';
             else if (filter === 'PLACED') displayLabel = language === 'ml' ? 'ബുക്ക് ചെയ്തവ' : 'PLACED';
             else if (filter === 'ACCEPTED') displayLabel = t.accepted || 'ACCEPTED';
             else if (filter === 'IN_PROGRESS') displayLabel = 'IN PROGRESS';
             else if (filter === 'COMPLETED') displayLabel = language === 'ml' ? 'പൂർത്തിയായവ' : 'COMPLETED';
             else if (filter === 'RETURNED') displayLabel = 'RETURNED';
             else if (filter === 'REJECTED') displayLabel = t.rejected || 'REJECTED';
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
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#DAA520" />}
        ListEmptyComponent={
          <View style={screenStyles.emptyContainer}>
            <FontAwesome name="calendar-times-o" size={50} color="#ddd" />
            <Text style={screenStyles.emptyText}>
              {language === 'ml' ? 'ബുക്കിംഗുകൾ ഒന്നും കണ്ടെത്തിയില്ല' : 'No bookings found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}