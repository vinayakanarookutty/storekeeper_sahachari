// D:\storekeeper_sahachari\app\product-detail.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getToken } from './services/auth';
import { styles } from './styles/product-detail.style';
import { useLanguage } from './contexts/LanguageContext';

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width, height } = Dimensions.get('window');

interface Offer {
  _id?: string;
  type: string;
  value: number;
  startDate: string;
  endDate: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number | string;
  quantity: number;
  category: string;
  images: string[];
  offers?: Offer[];
  unit?: string; 
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  
  const { t } = useLanguage();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerValue, setOfferValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const product: Product = params.product ? JSON.parse(params.product as string) : null;

  const isService = product?.category === 'Service';

  const extractNumericPrice = (price: number | string): number => {
    if (typeof price === 'number') return price;
    const numericString = price.toString().replace(/[^0-9.]/g, '');
    const numericPrice = parseFloat(numericString);
    return isNaN(numericPrice) ? 0 : numericPrice;
  };

  const numericPrice = extractNumericPrice(product?.price || 0);

  // SAFE STRUCTURAL TRANSLATION FOR UNITS
  const getLocalizedUnit = (): string => {
    if (!product) return '';
    
    let unitKey = product.unit || '';
    
    // Fallback parser for combined structures like "130/pcs"
    if (!unitKey && product.price) {
      const parts = product.price.toString().split('/');
      if (parts.length > 1) {
        unitKey = parts[1].trim();
      }
    }

    if (!unitKey) return '';
    
    const normalKey = unitKey.toLowerCase().trim();
    const contextMap = t as any;

    // 1. Explicitly check inner sub-object dictionary structure (t.units.pcs)
    if (contextMap.units && typeof contextMap.units === 'object') {
      if (normalKey in contextMap.units && typeof contextMap.units[normalKey] === 'string') {
        return contextMap.units[normalKey];
      }
      // Alternate case-sensitive lookup safety check
      if (unitKey in contextMap.units && typeof contextMap.units[unitKey] === 'string') {
        return contextMap.units[unitKey];
      }
    }

    // 2. Fallback check root-level object context mappings
    if (normalKey in contextMap && typeof contextMap[normalKey] === 'string') {
      return contextMap[normalKey];
    }
    if (unitKey in contextMap && typeof contextMap[unitKey] === 'string') {
      return contextMap[unitKey];
    }

    return unitKey; 
  };

  const localizedUnitLabel = getLocalizedUnit();

  // SAFE STRUCTURAL TRANSLATION FOR CATEGORIES
  const getLocalizedCategory = (): string => {
    if (!product?.category) return '';
    
    const catKey = product.category.trim();
    const lowerCatKey = catKey.toLowerCase();
    const contextMap = t as any;

    if (lowerCatKey in contextMap && typeof contextMap[lowerCatKey] === 'string') {
      return contextMap[lowerCatKey];
    }
    if (catKey in contextMap && typeof contextMap[catKey] === 'string') {
      return contextMap[catKey];
    }

    return catKey;
  };

  const getActiveOffer = () => {
    if (!product?.offers || product.offers.length === 0) return null;
    
    const now = new Date();
    return product.offers.find(offer => {
      const start = new Date(offer.startDate);
      const end = new Date(offer.endDate);
      return now >= start && now <= end;
    });
  };

  const activeOffer = getActiveOffer();
  const discountedPrice = activeOffer 
    ? numericPrice - (numericPrice * activeOffer.value / 100)
    : null;

  const addOfferMutation = useMutation({
    mutationFn: async (offerData: Omit<Offer, '_id'>) => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${product._id}/offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t.failedAddOffer);
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert(t.successTitle, t.offerAddedSuccess);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowOfferModal(false);
      resetOfferForm();
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(t.failedTitle, error.message || t.failedAddOffer);
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${product._id}/offer`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(t.failedDeleteOffer);
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert(t.successTitle, t.offerDeletedSuccess);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(t.failedTitle, error.message || t.failedDeleteOffer);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(isService ? t.failedDeleteService : t.failedDeleteProduct);
      }

      return response.json();
    },
    onSuccess: () => {
      const successMsg = isService ? t.serviceDeletedSuccess : t.productDeletedSuccess;
      Alert.alert(t.successTitle, successMsg, [
        {
          text: t.ok,
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            router.back();
          },
        },
      ]);
    },
    onError: (error: any) => {
      const fallbackError = isService ? t.failedDeleteService : t.failedDeleteProduct;
      Alert.alert(t.failedTitle, error.message || fallbackError);
    },
  });

  const handleEdit = () => {
    router.push({
      pathname: '/edit-product',
      params: {
        id: product._id,
        product: JSON.stringify(product),
      },
    });
  };

  const handleDelete = () => {
    const title = isService ? t.deleteServiceTitle : t.deleteProductTitle;
    const message = isService ? t.deleteServiceConfirm : t.deleteProductConfirm;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        deleteProductMutation.mutate(product._id);
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.delete,
            style: 'destructive',
            onPress: () => deleteProductMutation.mutate(product._id),
          },
        ]
      );
    }
  };

  const handleDeleteOffer = () => {
    Alert.alert(
      t.deleteOfferTitle,
      t.deleteOfferConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => deleteOfferMutation.mutate(),
        },
      ]
    );
  };

  const resetOfferForm = () => {
    setOfferValue('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleAddOffer = () => {
    if (!offerValue || parseFloat(offerValue) <= 0) {
      Alert.alert(t.failedTitle, t.invalidOfferValueError);
      return;
    }

    if (parseFloat(offerValue) > 100) {
      Alert.alert(t.failedTitle, t.offerExceedLimitError);
      return;
    }

    if (endDate <= startDate) {
      Alert.alert(t.failedTitle, t.dateOrderError);
      return;
    }

    const offerData: Omit<Offer, '_id'> = {
      type: 'PERCENTAGE',
      value: parseFloat(offerValue),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    addOfferMutation.mutate(offerData);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>{String(t.productNotFound || 'Product Not Found')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
          <FontAwesome name="arrow-left" size={20} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {product.images && product.images.length > 0 ? (
              product.images.map((imageKey, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageKey.startsWith('http') ? imageKey 
                      : `${S3_BASE_URL}/${imageKey}`
                     }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.imageGradient}
                  />
                </View>
              ))
            ) : (
              <View style={styles.noImageContainer}>
                <FontAwesome name="image" size={80} color="#DAA520" />
                <Text style={styles.noImageText}>{String(t.noImages || 'No Images')}</Text>
              </View>
            )}
          </ScrollView>

          {activeOffer && (
            <LinearGradient
              colors={['#FF6B6B', '#EE5A6F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.offerBadge}
            >
              <FontAwesome name="tag" size={16} color="#fff" />
              <Text style={styles.offerBadgeText}>{activeOffer.value}% {String(t.offLabel || 'OFF')}</Text>
            </LinearGradient>
          )}

          {product.images && product.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}

          {product.images && product.images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <FontAwesome name="image" size={14} color="#fff" />
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{product.images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <FontAwesome name="tag" size={12} color="#2E7D32" />
              <Text style={styles.categoryText}>
                {getLocalizedCategory()}
              </Text>
            </View>
            {!isService && (
              <View style={[styles.stockBadge, product.quantity < 10 && styles.lowStockBadge]}>
                <FontAwesome name="cube" size={12} color={product.quantity < 10 ? '#D32F2F' : '#666'} />
                <Text style={[styles.stockText, product.quantity < 10 && styles.lowStockText]}>
                  {product.quantity} {String(t.inStock || 'In Stock')}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          
          <LinearGradient
            colors={['#FFF9E6', '#FFF4D6']}
            style={styles.priceContainer}
          >
            <View style={styles.priceRow}>
              <View style={styles.priceMainRow}>
                <Text style={styles.currency}>₹</Text>
                {activeOffer ? (
                  <View style={styles.priceWithDiscountRow}>
                    <Text style={styles.originalPrice}>
                      {numericPrice.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.productPrice}>
                      {Math.round(discountedPrice!).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.productPrice}>
                    {numericPrice.toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
              {activeOffer && (
                <View style={styles.savingsChip}>
                  <Text style={styles.savingsText}>
                    {String(t.saveLabel || 'Save')} ₹{Math.round(numericPrice - discountedPrice!).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.priceLabel}>
              {String(t.perUnit || 'Per Unit')} {localizedUnitLabel ? `(1 ${localizedUnitLabel})` : ''}
            </Text>
          </LinearGradient>

          {/* Active Offers Section */}
          {product.offers && product.offers.length > 0 && (
            <View style={styles.offersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <FontAwesome name="percent" size={18} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>{String(t.activeOffers || 'Active Offers')}</Text>
                </View>
              </View>
              {product.offers.map((offer, index) => {
                const isOfferActive = () => {
                  const now = new Date();
                  const start = new Date(offer.startDate);
                  const end = new Date(offer.endDate);
                  return now >= start && now <= end;
                };
                
                return (
                  <LinearGradient
                    key={index}
                    colors={isOfferActive() ? ['#FFE5E5', '#FFF0F0'] : ['#F5F5F5', '#FAFAFA']}
                    style={styles.offerCard}
                  >
                    <View style={styles.offerHeader}>
                      <View style={styles.offerLeftSection}>
                        <LinearGradient
                          colors={['#FF6B6B', '#EE5A6F']}
                          style={styles.offerBadgeSmall}
                        >
                          <FontAwesome name="percent" size={14} color="#fff" />
                          <Text style={styles.offerValueText}>{offer.value}% {String(t.offLabel || 'OFF')}</Text>
                        </LinearGradient>
                        {isOfferActive() && (
                          <View style={styles.activeIndicator}>
                            <View style={styles.activeDotIndicator} />
                            <Text style={styles.activeText}>{String(t.statusActive || 'Active')}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={handleDeleteOffer}
                        style={styles.deleteOfferButton}
                      >
                        <FontAwesome name="trash-o" size={18} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.offerDatesRow}>
                      <View style={styles.dateChip}>
                        <FontAwesome name="calendar" size={12} color="#666" />
                        <Text style={styles.offerDates}>{formatDate(offer.startDate)}</Text>
                      </View>
                      <FontAwesome name="arrow-right" size={12} color="#999" />
                      <View style={styles.dateChip}>
                        <FontAwesome name="calendar" size={12} color="#666" />
                        <Text style={styles.offerDates}>{formatDate(offer.endDate)}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          )}

          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="align-left" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>{String(t.description || 'Description')}</Text>
            </View>
            <Text style={styles.productDescription}>{product.description}</Text>
          </View>

          {/* Product Stats Container */}
          <LinearGradient
            colors={['#F8F9FA', '#FFFFFF']}
            style={styles.statsContainer}
          >
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.statIconGradient}
                >
                  <FontAwesome name="rupee" size={20} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.statValue}>
                ₹{(activeOffer 
                  ? Math.round(discountedPrice!) * (isService ? 1 : product.quantity)
                  : numericPrice * (isService ? 1 : product.quantity)
                ).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statLabel}>
                {isService ? String(t.servicePriceLabel || 'Service Price') : String(t.totalValueLabel || 'Total Value')}
              </Text>
            </View>
            {!isService && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD']}
                      style={styles.statIconGradient}
                    >
                      <FontAwesome name="cubes" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>
                    {product.quantity} {localizedUnitLabel ? localizedUnitLabel : ''}
                  </Text>
                  <Text style={styles.statLabel}>{String(t.unitsAvailable || 'Units Available')}</Text>
                </View>
              </>
            )}
          </LinearGradient>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', '#FFFFFF']}
        style={styles.fixedButtonContainer}
      >
        <TouchableOpacity 
          style={styles.offerButtonWrapper} 
          onPress={() => setShowOfferModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.offerButton}
          >
            <FontAwesome name="percent" size={20} color="#fff" />
            <Text style={styles.buttonText}>{String(t.addOffer || 'Add Offer')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.iconButtonWrapper} 
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#DAA520', '#B8860B']}
            style={styles.iconButton}
          >
            <FontAwesome name="edit" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.iconButtonWrapper} 
          onPress={handleDelete}
          disabled={deleteProductMutation.isPending}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ff3b30', '#cc2f26']}
            style={styles.iconButton}
          >
            <FontAwesome name="trash" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Add Offer Modal */}
      <Modal
        visible={showOfferModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.modalIconContainer}
                >
                  <FontAwesome name="percent" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.modalTitle}>{String(t.addNewOfferTitle || 'Add New Offer')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{String(t.discountPercentageLabel || 'Discount Percentage')}</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome name="percent" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={String(t.discountPlaceholder || 'Enter percentage')}
                    value={offerValue}
                    onChangeText={setOfferValue}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{String(t.startDateLabel || 'Start Date')}</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <FontAwesome name="calendar" size={18} color="#4A90E2" />
                  <Text style={styles.datePickerText}>{formatDateDisplay(startDate)}</Text>
                  <FontAwesome name="chevron-down" size={14} color="#999" />
                </TouchableOpacity>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{String(t.endDateLabel || 'End Date')}</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <FontAwesome name="calendar" size={18} color="#4A90E2" />
                  <Text style={styles.datePickerText}>{formatDateDisplay(endDate)}</Text>
                  <FontAwesome name="chevron-down" size={14} color="#999" />
                </TouchableOpacity>
              </View>

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                  minimumDate={startDate}
                />
              )}

              {offerValue && parseFloat(offerValue) > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>{String(t.previewLabel || 'Preview')}</Text>
                  <LinearGradient
                    colors={['#FFE5E5', '#FFF0F0']}
                    style={styles.previewCard}
                  >
                    <View style={styles.previewBadge}>
                      <FontAwesome name="percent" size={16} color="#fff" />
                      <Text style={styles.previewBadgeText}>{offerValue}% {String(t.offLabel || 'OFF')}</Text>
                    </View>
                    <Text style={styles.previewPrice}>
                      ₹{numericPrice.toLocaleString('en-IN')} → ₹{Math.round(numericPrice - (numericPrice * parseFloat(offerValue) / 100)).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.previewSavings}>
                      {String(t.previewSavingsPrefix || 'You save')} ₹{Math.round(numericPrice * parseFloat(offerValue) / 100).toLocaleString('en-IN')} {String(t.previewSavingsSuffix || '')}
                    </Text>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowOfferModal(false);
                    resetOfferForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>{String(t.cancel || 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveButtonWrapper}
                  onPress={handleAddOffer}
                  disabled={addOfferMutation.isPending}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={styles.saveButton}
                  >
                    <FontAwesome name="check" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {addOfferMutation.isPending ? String(t.addingState || 'Adding...') : String(t.addOffer || 'Add Offer')}
                    </Text>
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