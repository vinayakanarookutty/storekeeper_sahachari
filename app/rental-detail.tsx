// D:\storekeeper_sahachari\app\rental-detail.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from './contexts/LanguageContext';
import { getToken } from './services/auth';
import { styles } from './styles/product-detail.style';

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width } = Dimensions.get('window');

// Using your secure storekeeper detailed view route
async function fetchRentalById(id: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/rentals/store/my-rentals/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch rental information');
  return res.json();
}

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Offer States
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [offerValue, setOfferValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Core Query Fetches Data
  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rentalDetail', id],
    queryFn: () => fetchRentalById(id!),
    enabled: !!id,
  });

  // 1. DELETE RENTAL MUTATION
  const deleteRentalMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/rentals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete rental asset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      Alert.alert(t.successTitle || 'Success', 'Rental item deleted safely.');
      router.back();
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  // 2. ADD OFFER MUTATION (Points to your POST rentals/:id/offer backend)
  const addOfferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/rentals/${id}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Could not attach offer data metrics');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalDetail', id] });
      setShowOfferModal(false);
      resetOfferForm();
      Alert.alert(t.successTitle || 'Success', t.offerAddedSuccess || 'Offer attached successfully.');
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  // 3. REMOVE OFFER MUTATION (Points to your DELETE rentals/:id/offer backend)
  const removeOfferMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/rentals/${id}/offer`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to clear target offer from backend');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalDetail', id] });
      Alert.alert(t.successTitle || 'Cleared', t.offerDeletedSuccess || 'All promotion offers removed.');
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  const resetOfferForm = () => {
    setDiscountType('PERCENTAGE');
    setOfferValue('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleAddOffer = () => {
    const val = parseFloat(offerValue);
    if (!offerValue || isNaN(val) || val <= 0) {
      Alert.alert(t.failedTitle || 'Error', t.invalidOfferValueError || 'Provide valid promotional metrics');
      return;
    }
    if (discountType === 'PERCENTAGE' && val > 100) {
      Alert.alert(t.failedTitle || 'Error', t.offerExceedLimitError || 'Percentage cannot exceed 100%');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert(t.failedTitle || 'Error', t.dateOrderError || 'End date must arrive after start date');
      return;
    }

    // Matches your backend AddRentalOfferDto structure
    addOfferMutation.mutate({
      type: discountType,
      value: val,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleDeleteOffer = () => {
    Alert.alert(
      t.deleteOfferTitle || 'Delete Offer',
      t.deleteOfferConfirm || 'Are you certain you want to clear active offers?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { text: t.delete || 'Delete', style: 'destructive', onPress: () => removeOfferMutation.mutate() },
      ]
    );
  };

  const handleDeleteItem = () => {
    Alert.alert(t.deleteProductTitle || 'Confirm Delete', 'Are you certain you want to clear this rental resource?', [
      { text: t.cancel || 'Cancel', style: 'cancel' },
      { text: t.delete || 'Delete', style: 'destructive', onPress: () => deleteRentalMutation.mutate() },
    ]);
  };

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  if (error || !rental) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unavailable Rental Reference</Text>
      </View>
    );
  }

  // Dynamic price evaluation mechanics
  const basePrice = rental.rentalPrice || 0;
  const activeOffer = rental.offers?.find((o: any) => o.isActive);
  let finalPrice = basePrice;
  let savings = 0;

  if (activeOffer) {
    if (activeOffer.type === 'PERCENTAGE') {
      savings = (basePrice * activeOffer.value) / 100;
      finalPrice = basePrice - savings;
    } else if (activeOffer.type === 'FLAT') {
      savings = activeOffer.value;
      finalPrice = basePrice - savings;
    }
  }
  finalPrice = Math.max(finalPrice, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
          <FontAwesome name="arrow-left" size={20} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Gallery Image Layout */}
        <View style={styles.imageSection}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {rental.images && rental.images.length > 0 ? (
              rental.images.map((imageKey: string, index: number) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageKey.startsWith('http') ? imageKey : `${S3_BASE_URL}/${imageKey}` }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']} style={styles.imageGradient} />
                </View>
              ))
            ) : (
              <View style={styles.noImageContainer}>
                <FontAwesome name="image" size={80} color="#DAA520" />
                <Text style={styles.noImageText}>{String(t.noImages || 'No Images Available')}</Text>
              </View>
            )}
          </ScrollView>

          {activeOffer && (
            <LinearGradient colors={['#FF6B6B', '#EE5A6F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerBadge}>
              <FontAwesome name="tag" size={16} color="#fff" />
              <Text style={styles.offerBadgeText}>
                {activeOffer.type === 'PERCENTAGE' ? `${activeOffer.value}% ${t.offLabel || 'OFF'}` : `₹${activeOffer.value} ${t.offLabel || 'OFF'}`}
              </Text>
            </LinearGradient>
          )}

          {rental.images && rental.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {rental.images.map((_: any, index: number) => (
                <View key={index} style={[styles.dot, index === currentImageIndex && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* Info Layout Sheet */}
        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <FontAwesome name="retweet" size={12} color="#2E7D32" />
              <Text style={styles.categoryText}>{rental.category || 'Rental Asset'}</Text>
            </View>
            <View style={[styles.stockBadge, rental.quantity < 3 && styles.lowStockBadge]}>
              <FontAwesome name="cube" size={12} color={rental.quantity < 3 ? '#D32F2F' : '#666'} />
              <Text style={[styles.stockText, rental.quantity < 3 && styles.lowStockText]}>
                {rental.quantity} {String(t.inStock || 'Units Available')}
              </Text>
            </View>
          </View>

          <Text style={styles.productName}>{rental.name}</Text>
          
          <LinearGradient colors={['#FFF9E6', '#FFF4D6']} style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <View style={styles.priceMainRow}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.productPrice}>{Math.round(finalPrice).toLocaleString('en-IN')}</Text>
                <Text style={{ color: '#666', fontSize: 16 }}> / {rental.unit || 'DAY'}</Text>
              </View>
              {activeOffer && (
                <View style={styles.savingsChip}>
                  <Text style={styles.savingsText}>{String(t.saveLabel || 'Save')} ₹{Math.round(savings).toLocaleString('en-IN')}</Text>
                </View>
              )}
            </View>
            {activeOffer && (
              <Text style={[styles.originalPrice, { marginTop: 4 }]}>Original Base: ₹{basePrice}</Text>
            )}
          </LinearGradient>

          {/* Active Offer Tracker Cards */}
          {rental.offers && rental.offers.length > 0 && (
            <View style={styles.offersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <FontAwesome name="percent" size={18} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>{String(t.activeOffers || 'Active Offers')}</Text>
                </View>
              </View>
              {rental.offers.map((offer: any, index: number) => (
                <LinearGradient key={index} colors={offer.isActive ? ['#FFE5E5', '#FFF0F0'] : ['#F5F5F5', '#FAFAFA']} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View style={styles.offerLeftSection}>
                      <LinearGradient colors={['#FF6B6B', '#EE5A6F']} style={styles.offerBadgeSmall}>
                        <Text style={styles.offerValueText}>
                          {offer.type === 'PERCENTAGE' ? `${offer.value}%` : `₹${offer.value}`} {String(t.offLabel || 'OFF')}
                        </Text>
                      </LinearGradient>
                      {offer.isActive && (
                        <View style={styles.activeIndicator}>
                          <View style={styles.activeDotIndicator} />
                          <Text style={styles.activeText}>{String(t.statusActive || 'Active')}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={handleDeleteOffer} style={styles.deleteOfferButton}>
                      <FontAwesome name="trash-o" size={18} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                  {offer.startDate && offer.endDate && (
                    <View style={styles.offerDatesRow}>
                      <View style={styles.dateChip}>
                        <FontAwesome name="calendar" size={12} color="#666" />
                        <Text style={styles.offerDates}>{new Date(offer.startDate).toLocaleDateString('en-IN')}</Text>
                      </View>
                      <FontAwesome name="arrow-right" size={12} color="#999" />
                      <View style={styles.dateChip}>
                        <FontAwesome name="calendar" size={12} color="#666" />
                        <Text style={styles.offerDates}>{new Date(offer.endDate).toLocaleDateString('en-IN')}</Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              ))}
            </View>
          )}

          {/* Details Descriptions */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="align-left" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>{String(t.description || 'Description')}</Text>
            </View>
            <Text style={styles.productDescription}>{rental.description || 'No specific descriptions provided.'}</Text>
          </View>
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Styled Layout Buttons Row */}
      <LinearGradient colors={['rgba(255,255,255,0.95)', '#FFFFFF']} style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.offerButtonWrapper} onPress={() => setShowOfferModal(true)} activeOpacity={0.8}>
          <LinearGradient colors={['#4A90E2', '#357ABD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerButton}>
            <FontAwesome name="percent" size={20} color="#fff" />
            <Text style={styles.buttonText}>Configure Deal</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButtonWrapper} onPress={() => router.push({ pathname: '/edit-rentals', params: { id, rental: JSON.stringify(rental) } })} activeOpacity={0.8}>
          <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.iconButton}>
            <FontAwesome name="edit" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButtonWrapper} onPress={handleDeleteItem} disabled={deleteRentalMutation.isPending} activeOpacity={0.8}>
          <LinearGradient colors={['#ff3b30', '#cc2f26']} style={styles.iconButton}>
            <FontAwesome name="trash" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Structured Modal Layer Configuration */}
      <Modal visible={showOfferModal} animationType="slide" transparent={true} onRequestClose={() => setShowOfferModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.modalIconContainer}>
                  <FontAwesome name="percent" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.modalTitle}>Configure Promotion Deal</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Calculation Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'PERCENTAGE' ? '#4A90E2' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('PERCENTAGE')}>
                    <Text style={{ color: discountType === 'PERCENTAGE' ? '#FFF' : '#333', fontWeight: 'bold' }}>Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'FLAT' ? '#4A90E2' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('FLAT')}>
                    <Text style={{ color: discountType === 'FLAT' ? '#FFF' : '#333', fontWeight: 'bold' }}>Flat Amount (₹)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Structural Value</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome name="money" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 250'}
                    value={offerValue}
                    onChangeText={setOfferValue}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{String(t.startDateLabel || 'Start Date')}</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartDatePicker(true)}>
                  <FontAwesome name="calendar" size={18} color="#4A90E2" />
                  <Text style={styles.datePickerText}>{startDate.toLocaleDateString('en-IN')}</Text>
                  <FontAwesome name="chevron-down" size={14} color="#999" />
                </TouchableOpacity>
              </View>
              {showStartDatePicker && (
                <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, d) => { setShowStartDatePicker(Platform.OS === 'ios'); if(d) setStartDate(d); }} minimumDate={new Date()} />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{String(t.endDateLabel || 'End Date')}</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowEndDatePicker(true)}>
                  <FontAwesome name="calendar" size={18} color="#4A90E2" />
                  <Text style={styles.datePickerText}>{endDate.toLocaleDateString('en-IN')}</Text>
                  <FontAwesome name="chevron-down" size={14} color="#999" />
                </TouchableOpacity>
              </View>
              {showEndDatePicker && (
                <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, d) => { setShowEndDatePicker(Platform.OS === 'ios'); if(d) setEndDate(d); }} minimumDate={startDate} />
              )}

              {offerValue && parseFloat(offerValue) > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Active Deal Calculations Preview</Text>
                  <LinearGradient colors={['#FFE5E5', '#FFF0F0']} style={styles.previewCard}>
                    <Text style={styles.previewPrice}>
                      ₹{basePrice.toLocaleString('en-IN')} → ₹{Math.round(finalPrice).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.previewSavings}>
                      Reduction metrics active: ₹{Math.round(savings).toLocaleString('en-IN')} Saved
                    </Text>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowOfferModal(false); resetOfferForm(); }}>
                  <Text style={styles.cancelButtonText}>{String(t.cancel || 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleAddOffer} disabled={addOfferMutation.isPending}>
                  <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.saveButton}>
                    <FontAwesome name="check" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Apply Promotion</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}