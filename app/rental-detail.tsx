import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { styles } from './styles/product-detail.style'; // Uses your uploaded styles architecture

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchRentalById(id: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/rentals/${id}`, {
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Form states for adding promotions
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rentalDetail', id],
    queryFn: () => fetchRentalById(id!),
    enabled: !!id,
  });

  const deleteRentalMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/storekeeper/rentals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete rental asset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeDashboardItems'] });
      Alert.alert('Success', 'Rental tracking item deleted safely.');
      router.back();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

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
      if (!res.ok) throw new Error('Could not append promotional values');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalDetail', id] });
      setShowOfferModal(false);
      resetOfferForm();
      Alert.alert('Success', 'Inventory offer attached successfully.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const removeOfferMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/rentals/${id}/offer`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to erase active offers');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalDetail', id] });
      Alert.alert('Eradicated', 'All offers cleared.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const resetOfferForm = () => {
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setStartDate(new Date());
    setEndDate(new Date());
  };

  const handleAddOffer = () => {
    const val = parseFloat(discountValue);
    if (!discountValue || isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Provide valid promotional metrics');
      return;
    }
    addOfferMutation.mutate({
      type: discountType,
      value: val,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleDeleteItem = () => {
    Alert.alert('Confirm Delete', 'Are you certain you want to clear this rental resource?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRentalMutation.mutate() },
    ]);
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

  // Derived price computation
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color="#2D2416" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => router.push({ pathname: '/edit-rentals', params: { rental: JSON.stringify(rental) } })}>
          <FontAwesome name="pencil" size={18} color="#DAA520" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          {rental.images && rental.images.length > 0 ? (
            <FlatList
              data={rental.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                setActiveIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: `${S3_BASE_URL}/${item}` }} style={styles.productImage} resizeMode="cover" />
                </View>
              )}
              keyExtractor={(img, idx) => idx.toString()}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <FontAwesome name="cube" size={50} color="#DAA520" />
              <Text style={styles.noImageText}>No asset visuals provided</Text>
            </View>
          )}

          {activeOffer && (
            <LinearGradient colors={['#FF6B6B', '#FF8E53']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerBadge}>
              <FontAwesome name="bolt" size={16} color="#fff" />
              <Text style={styles.offerBadgeText}>
                {activeOffer.type === 'PERCENTAGE' ? `${activeOffer.value}% OFF` : `₹${activeOffer.value} OFF`}
              </Text>
            </LinearGradient>
          )}

          {rental.images && rental.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {rental.images.map((_: any, idx: number) => (
                <View key={idx} style={[styles.dot, activeIndex === idx && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{rental.category || 'Rental'}</Text>
            </View>
            <View style={[styles.stockBadge, rental.quantity <= 2 && styles.lowStockBadge]}>
              <Text style={[styles.stockText, rental.quantity <= 2 && styles.lowStockText]}>
                Stock quantity: {rental.quantity}
              </Text>
            </View>
          </View>

          <Text style={styles.productName}>{rental.name}</Text>

          <LinearGradient colors={['#FFFDF9', '#FFF9E6']} style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rental Rate Strategy</Text>
              <View style={styles.priceMainRow}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.productPrice}>{finalPrice}</Text>
                <Text style={{ color: '#666', fontSize: 16 }}> / {rental.unit || 'DAY'}</Text>
              </View>
              {activeOffer && (
                <View style={styles.priceWithDiscountRow}>
                  <Text style={styles.originalPrice}>₹{basePrice}</Text>
                  <View style={styles.savingsChip}>
                    <Text style={styles.savingsText}>Saved ₹{savings}</Text>
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>

          {activeOffer && (
            <View style={styles.offersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <FontAwesome name="ticket" size={20} color="#2D2416" />
                  <Text style={styles.sectionTitle}>Active Operational Listing Discount</Text>
                </View>
              </View>
              <LinearGradient colors={['#FFF9F9', '#FFF2F2']} style={[styles.offerCard, { borderColor: '#FFD1D1', borderWidth: 1 }]}>
                <View style={styles.offerHeader}>
                  <View style={styles.offerLeftSection}>
                    <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.offerBadgeSmall}>
                      <Text style={styles.offerValueText}>
                        {activeOffer.type === 'PERCENTAGE' ? `${activeOffer.value}%` : `₹${activeOffer.value}`}
                      </Text>
                    </LinearGradient>
                    <View style={styles.activeIndicator}>
                      <View style={styles.activeDotIndicator} />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteOfferButton} onPress={() => removeOfferMutation.mutate()}>
                    <FontAwesome name="trash" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.productDescription}>{rental.description || 'No conditions logged.'}</Text>
          </View>
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.offerButtonWrapper} onPress={() => setShowOfferModal(true)}>
          <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.offerButton}>
            <FontAwesome name="tag" size={18} color="#fff" />
            <Text style={styles.buttonText}>Configure Deal</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButtonWrapper} onPress={handleDeleteItem}>
          <LinearGradient colors={['#FF4D4D', '#C62828']} style={styles.iconButton}>
            <FontAwesome name="trash" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Offer Modal */}
      <Modal visible={showOfferModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Rental Offer</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'PERCENTAGE' ? '#DAA520' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('PERCENTAGE')}>
                    <Text style={{ color: discountType === 'PERCENTAGE' ? '#FFF' : '#333', fontWeight: 'bold' }}>Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'FLAT' ? '#DAA520' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('FLAT')}>
                    <Text style={{ color: discountType === 'FLAT' ? '#FFF' : '#333', fontWeight: 'bold' }}>Flat Amount (₹)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Value</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={discountValue} onChangeText={setDiscountValue} placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 150'} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowOfferModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleAddOffer}>
                  <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.saveButton}>
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