import FontAwesome from '@expo/vector-icons/FontAwesome';
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['serviceDetail', id],
    queryFn: () => fetchServiceById(id!),
    enabled: !!id,
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to drop service structural endpoint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeDashboardItems'] });
      Alert.alert('Eradicated', 'Professional service variant deleted safely.');
      router.back();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const addOfferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save operational service discount');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceDetail', id] });
      setShowOfferModal(false);
      setDiscountValue('');
      Alert.alert('Success', 'Operational deal successfully bound.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const removeOfferMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/services/${id}/offer`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erase operational payload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceDetail', id] });
      Alert.alert('Cleaned', 'Service listings returned to default tariffs.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleAddOffer = () => {
    const val = parseFloat(discountValue);
    if (!discountValue || isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Provide realistic parameters');
      return;
    }
    addOfferMutation.mutate({
      type: discountType,
      value: val,
      isActive: true,
    });
  };

  const handleDeleteItem = () => {
    Alert.alert('Confirm Delete', 'Remove professional assistance item permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteServiceMutation.mutate() },
    ]);
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color="#2D2416" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => router.push({ pathname: '/edit-services', params: { service: JSON.stringify(service) } })}>
          <FontAwesome name="pencil" size={18} color="#DAA520" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          {service.images && service.images.length > 0 ? (
            <FlatList
              data={service.images}
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
              <FontAwesome name="wrench" size={50} color="#DAA520" />
              <Text style={styles.noImageText}>No service media configured</Text>
            </View>
          )}

          {activeOffer && (
            <LinearGradient colors={['#FF6B6B', '#FF8E53']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerBadge}>
              <FontAwesome name="bolt" size={16} color="#fff" />
              <Text style={styles.offerBadgeText}>
                {activeOffer.type === 'PERCENTAGE' ? `${activeOffer.value}% DEAL` : `₹${activeOffer.value} OFF`}
              </Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={[styles.categoryBadge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.categoryText, { color: '#0D47A1' }]}>{service.category || 'Service'}</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>
                {service.isAvailable ? 'Active Allocation' : 'Offline'}
              </Text>
            </View>
          </View>

          <Text style={styles.productName}>{service.name}</Text>

          <LinearGradient colors={['#FFFDF9', '#FFF9E6']} style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Service Cost Structure</Text>
              <View style={styles.priceMainRow}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.productPrice}>{finalPrice}</Text>
                <Text style={{ color: '#666', fontSize: 16 }}> / {service.unit || 'VISIT'}</Text>
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
                  <FontAwesome name="gift" size={20} color="#2D2416" />
                  <Text style={styles.sectionTitle}>Campaign Value Active</Text>
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
                  </View>
                  <TouchableOpacity style={styles.deleteOfferButton} onPress={() => removeOfferMutation.mutate()}>
                    <FontAwesome name="trash" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Service Parameters / Scope</Text>
            <Text style={styles.productDescription}>{service.description || 'No data logged.'}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.offerButtonWrapper} onPress={() => setShowOfferModal(true)}>
          <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.offerButton}>
            <FontAwesome name="tags" size={18} color="#fff" />
            <Text style={styles.buttonText}>Edit Pricing Offer</Text>
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
              <Text style={styles.modalTitle}>Add Service Promotion</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Value Mapping</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'PERCENTAGE' ? '#DAA520' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('PERCENTAGE')}>
                  <Text style={{ color: discountType === 'PERCENTAGE' ? '#FFF' : '#333', fontWeight: 'bold' }}>Percentage (%)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'FLAT' ? '#DAA520' : '#F5F5F5', borderRadius: 8, alignItems: 'center' }} onPress={() => setDiscountType('FLAT')}>
                  <Text style={{ color: discountType === 'FLAT' ? '#FFF' : '#333', fontWeight: 'bold' }}>Flat Discount (₹)</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={discountValue} onChangeText={setDiscountValue} placeholder="Value" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowOfferModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleAddOffer}>
                <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Confirm Promotion</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}