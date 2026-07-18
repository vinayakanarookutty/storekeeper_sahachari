// D:\storekeeper_sahachari\app\service-detail.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
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

async function fetchServiceById(id: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/services/find/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load target service metrics');
  return res.json();
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  
  // Promotional Settings States
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [offerValue, setOfferValue] = useState('');

  // Core Service Data Fetch Query Hook
  const { data: service, isLoading, error } = useQuery({
    queryKey: ['serviceDetail', id],
    queryFn: () => fetchServiceById(id!),
    enabled: !!id,
  });

  // 1. DELETE ACTION MUTATION HOOK
  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete service instance from database');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeDashboardItems'] });
      Alert.alert(t.successTitle || 'Success', 'Professional service variant deleted safely.');
      router.back();
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  // 2. CREATE SERVICE PROMOTION DEAL MUTATION HOOK
  const addOfferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload), // Sends only type and value to avoid 400 Bad Request
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save operational service discount');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceDetail', id] });
      setShowOfferModal(false);
      setOfferValue('');
      Alert.alert(t.successTitle || 'Success', t.offerAddedSuccess || 'Operational deal successfully bound.');
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  // 3. WIPE PROMOTIONS MUTATION HOOK
  const removeOfferMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}/offer`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erase operational promotional payloads failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceDetail', id] });
      Alert.alert(t.successTitle || 'Cleaned', t.offerDeletedSuccess || 'Service listings returned to default tariffs.');
    },
    onError: (err: any) => Alert.alert(t.failedTitle || 'Error', err.message),
  });

  const handleAddOffer = () => {
    const val = parseFloat(offerValue);
    if (!offerValue || isNaN(val) || val <= 0) {
      Alert.alert(t.failedTitle || 'Error', t.invalidOfferValueError || 'Provide realistic parameters');
      return;
    }
    if (discountType === 'PERCENTAGE' && val > 100) {
      Alert.alert(t.failedTitle || 'Error', t.offerExceedLimitError || 'Percentage cannot exceed 100%');
      return;
    }

    // Clean payload containing only parameters expected by AddServiceOfferDto
    addOfferMutation.mutate({
      type: discountType,
      value: val,
    });
  };

  const handleDeleteOffer = () => {
    Alert.alert(
      t.deleteOfferTitle || 'Delete Offer',
      t.deleteOfferConfirm || 'Are you certain you want to clear active promotional items?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { text: t.delete || 'Delete', style: 'destructive', onPress: () => removeOfferMutation.mutate() },
      ]
    );
  };

  const handleDeleteItem = () => {
    Alert.alert(t.deleteProductTitle || 'Confirm Delete', 'Remove professional assistance item permanently?', [
      { text: t.cancel || 'Cancel', style: 'cancel' },
      { text: t.delete || 'Delete', style: 'destructive', onPress: () => deleteServiceMutation.mutate() },
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

  if (error || !service) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Service Record Unavailable</Text>
      </View>
    );
  }

  // Live Price Deductions Calculations Logic Mapping
  const basePrice = service.price || 0;
  const activeOffer = service.offers?.find((o: any) => o.isActive);
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
      
      {/* Absolute Header Navigation Actions Row */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
          <FontAwesome name="arrow-left" size={20} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Horizontal Media Multi-slider Engine */}
        <View style={styles.imageSection}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {service.images && service.images.length > 0 ? (
              service.images.map((imageKey: string, index: number) => (
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
                <FontAwesome name="wrench" size={80} color="#DAA520" />
                <Text style={styles.noImageText}>{String(t.noImages || 'No Media Configured')}</Text>
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

          {service.images && service.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {service.images.map((_: any, index: number) => (
                <View key={index} style={[styles.dot, index === currentImageIndex && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* Informational Structure Layer */}
        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={[styles.categoryBadge, { backgroundColor: '#E3F2FD' }]}>
              <FontAwesome name="gears" size={12} color="#0D47A1" />
              <Text style={[styles.categoryText, { color: '#0D47A1' }]}>{service.category || 'Professional Service'}</Text>
            </View>
            <View style={[styles.stockBadge, !service.isAvailable && styles.lowStockBadge]}>
              <FontAwesome name="circle" size={10} color={service.isAvailable ? '#2E7D32' : '#D32F2F'} />
              <Text style={[styles.stockText, !service.isAvailable && styles.lowStockText]}>
                {service.isAvailable ? 'Active Allocation' : 'Offline'}
              </Text>
            </View>
          </View>

          <Text style={styles.productName}>{service.name}</Text>
          
          <LinearGradient colors={['#FFF9E6', '#FFF4D6']} style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <View style={styles.priceMainRow}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.productPrice}>{Math.round(finalPrice).toLocaleString('en-IN')}</Text>
                <Text style={{ color: '#666', fontSize: 16 }}> / {service.unit || 'VISIT'}</Text>
              </View>
              {activeOffer && (
                <View style={styles.savingsChip}>
                  <Text style={styles.savingsText}>{String(t.saveLabel || 'Save')} ₹{Math.round(savings).toLocaleString('en-IN')}</Text>
                </View>
              )}
            </View>
            {activeOffer && (
              <Text style={[styles.originalPrice, { marginTop: 4 }]}>Base Tariff: ₹{basePrice}</Text>
            )}
          </LinearGradient>

          {/* Active Campaign Discounts Tracker */}
          {service.offers && service.offers.length > 0 && (
            <View style={styles.offersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <FontAwesome name="gift" size={18} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>{String(t.activeOffers || 'Active Offers')}</Text>
                </View>
              </View>
              {service.offers.map((offer: any, index: number) => (
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
                </LinearGradient>
              ))}
            </View>
          )}

          {/* Scope Descriptions */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="align-left" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Service Parameters / Scope</Text>
            </View>
            <Text style={styles.productDescription}>{service.description || 'No descriptive data parameters logged.'}</Text>
          </View>
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Structured Layout Bottom Action Control Tray */}
      <LinearGradient colors={['rgba(255,255,255,0.95)', '#FFFFFF']} style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.offerButtonWrapper} onPress={() => setShowOfferModal(true)} activeOpacity={0.8}>
          <LinearGradient colors={['#4A90E2', '#357ABD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerButton}>
            <FontAwesome name="tags" size={20} color="#fff" />
            <Text style={styles.buttonText}>Edit Pricing Offer</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButtonWrapper} onPress={() => router.push({ pathname: '/edit-services', params: { service: JSON.stringify(service) } })} activeOpacity={0.8}>
          <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.iconButton}>
            <FontAwesome name="edit" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButtonWrapper} onPress={handleDeleteItem} disabled={deleteServiceMutation.isPending} activeOpacity={0.8}>
          <LinearGradient colors={['#ff3b30', '#cc2f26']} style={styles.iconButton}>
            <FontAwesome name="trash" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Specialized Promotional Creation Sheet Overlay */}
      <Modal visible={showOfferModal} animationType="slide" transparent={true} onRequestClose={() => setShowOfferModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.modalIconContainer}>
                  <FontAwesome name="percent" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.modalTitle}>Configure Service Promotion</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Value Mapping Strategy</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'PERCENTAGE' ? '#4A90E2' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('PERCENTAGE')}>
                    <Text style={{ color: discountType === 'PERCENTAGE' ? '#FFF' : '#333', fontWeight: 'bold' }}>Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'FLAT' ? '#4A90E2' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('FLAT')}>
                    <Text style={{ color: discountType === 'FLAT' ? '#FFF' : '#333', fontWeight: 'bold' }}>Flat Discount (₹)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Structural Discount Value</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome name="money" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10 for 10%' : 'e.g. 500'}
                    value={offerValue}
                    onChangeText={setOfferValue}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Dynamic Live Computation Calculation Sheet Preview */}
              {offerValue && parseFloat(offerValue) > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Active Campaign Discount Estimates Preview</Text>
                  <LinearGradient colors={['#FFE5E5', '#FFF0F0']} style={styles.previewCard}>
                    <Text style={styles.previewPrice}>
                      ₹{basePrice.toLocaleString('en-IN')} → ₹{Math.round(finalPrice).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.previewSavings}>
                      Reduction metrics active: ₹{Math.round(savings).toLocaleString('en-IN')} Off Base
                    </Text>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowOfferModal(false); setOfferValue(''); }}>
                  <Text style={styles.cancelButtonText}>{String(t.cancel || 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleAddOffer} disabled={addOfferMutation.isPending}>
                  <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.saveButton}>
                    <FontAwesome name="check" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Confirm Promotion</Text>
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