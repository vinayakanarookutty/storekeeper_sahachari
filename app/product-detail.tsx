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
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerValue, setOfferValue] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const product: Product = params.product ? JSON.parse(params.product as string) : null;

  // Extract numeric value from price string
  const extractNumericPrice = (price: number | string): number => {
    if (typeof price === 'number') return price;
    
    // Remove currency symbols, spaces, and non-numeric characters except decimal point
    const numericString = price.toString().replace(/[^0-9.]/g, '');
    const numericPrice = parseFloat(numericString);
    
    return isNaN(numericPrice) ? 0 : numericPrice;
  };

  const numericPrice = extractNumericPrice(product?.price || 0);

  // Calculate discounted price if active offer exists
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

  // Add Offer Mutation
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
        throw new Error(error.message || 'Failed to add offer');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Offer added successfully!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowOfferModal(false);
      resetOfferForm();
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to add offer');
    },
  });

  // Delete Offer Mutation
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
        throw new Error('Failed to delete offer');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Offer deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete offer');
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
        throw new Error('Failed to delete product');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Product deleted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            router.back();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete product');
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
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProductMutation.mutate(product._id),
        },
      ]
    );
  };

  const handleDeleteOffer = () => {
    Alert.alert(
      'Delete Offer',
      'Are you sure you want to delete this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
    // Validation
    if (!offerValue || parseFloat(offerValue) <= 0) {
      Alert.alert('Error', 'Please enter a valid offer value');
      return;
    }

    if (parseFloat(offerValue) > 100) {
      Alert.alert('Error', 'Discount cannot exceed 100%');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date');
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
        <Text style={styles.errorText}>Product not found</Text>
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
        <TouchableOpacity onPress={handleEdit} style={styles.floatingButton}>
          <FontAwesome name="edit" size={20} color="#2D2416" />
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
                    source={{ uri: `${S3_BASE_URL}/${imageKey}` }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {/* Gradient Overlay */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.imageGradient}
                  />
                </View>
              ))
            ) : (
              <View style={styles.noImageContainer}>
                <FontAwesome name="image" size={80} color="#DAA520" />
                <Text style={styles.noImageText}>No images available</Text>
              </View>
            )}
          </ScrollView>

          {/* Active Offer Badge with Gradient */}
          {activeOffer && (
            <LinearGradient
              colors={['#FF6B6B', '#EE5A6F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.offerBadge}
            >
              <FontAwesome name="tag" size={16} color="#fff" />
              <Text style={styles.offerBadgeText}>{activeOffer.value}% OFF</Text>
            </LinearGradient>
          )}

          {/* Image Dots Indicator */}
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

          {/* Image Counter Badge */}
          {product.images && product.images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <FontAwesome name="images" size={14} color="#fff" />
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{product.images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          {/* Category & Stock Row */}
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <FontAwesome name="tag" size={12} color="#2E7D32" />
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <View style={[styles.stockBadge, product.quantity < 10 && styles.lowStockBadge]}>
              <FontAwesome name="cube" size={12} color={product.quantity < 10 ? '#D32F2F' : '#666'} />
              <Text style={[styles.stockText, product.quantity < 10 && styles.lowStockText]}>
                {product.quantity} in stock
              </Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Price Card with Gradient */}
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
                    Save ₹{Math.round(numericPrice - discountedPrice!).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.priceLabel}>per unit</Text>
          </LinearGradient>

          {/* Active Offers Section */}
          {product.offers && product.offers.length > 0 && (
            <View style={styles.offersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <FontAwesome name="percent" size={18} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>Active Offers</Text>
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
                          <Text style={styles.offerValueText}>{offer.value}% OFF</Text>
                        </LinearGradient>
                        {isOfferActive() && (
                          <View style={styles.activeIndicator}>
                            <View style={styles.activeDotIndicator} />
                            <Text style={styles.activeText}>Active</Text>
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

          {/* Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="align-left" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.productDescription}>{product.description}</Text>
          </View>

          {/* Product Stats with Gradient */}
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
                  ? Math.round(discountedPrice!) * product.quantity 
                  : numericPrice * product.quantity
                ).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statLabel}>Total Value</Text>
            </View>
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
              <Text style={styles.statValue}>{product.quantity}</Text>
              <Text style={styles.statLabel}>Units Available</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom spacing for fixed buttons */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Action Buttons with Gradient */}
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
            <Text style={styles.buttonText}>Add Offer</Text>
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
                <Text style={styles.modalTitle}>Add New Offer</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <FontAwesome name="times-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Discount Value Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Percentage</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome name="percent" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter discount (e.g., 10)"
                    value={offerValue}
                    onChangeText={setOfferValue}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Start Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start Date</Text>
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

              {/* End Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Date</Text>
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

              {/* Preview Card */}
              {offerValue && parseFloat(offerValue) > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <LinearGradient
                    colors={['#FFE5E5', '#FFF0F0']}
                    style={styles.previewCard}
                  >
                    <View style={styles.previewBadge}>
                      <FontAwesome name="percent" size={16} color="#fff" />
                      <Text style={styles.previewBadgeText}>{offerValue}% OFF</Text>
                    </View>
                    <Text style={styles.previewPrice}>
                      ₹{numericPrice.toLocaleString('en-IN')} → ₹{Math.round(numericPrice - (numericPrice * parseFloat(offerValue) / 100)).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.previewSavings}>
                      You save ₹{Math.round(numericPrice * parseFloat(offerValue) / 100).toLocaleString('en-IN')} per unit
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowOfferModal(false);
                    resetOfferForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
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
                      {addOfferMutation.isPending ? 'Adding...' : 'Add Offer'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  imageSection: {
    position: 'relative',
  },
  imageContainer: {
    width: width,
    height: 400,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 400,
  },
  noImageContainer: {
    width: width,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
  },
  noImageText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  offerBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  lowStockBadge: {
    backgroundColor: '#FFEBEE',
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  lowStockText: {
    color: '#D32F2F',
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 20,
    lineHeight: 36,
  },
  priceContainer: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  priceRow: {
    marginBottom: 4,
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DAA520',
    marginRight: 4,
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  originalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    textDecorationLine: 'line-through',
  },
  productPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#DAA520',
  },
  savingsChip: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  savingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  offersSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  offerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offerBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  offerValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  deleteOfferButton: {
    padding: 8,
  },
  offerDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  offerDates: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 26,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  offerButtonWrapper: {
    flex: 1,
  },
  offerButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconButtonWrapper: {
    width: 56,
    height: 56,
  },
  iconButton: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2D2416',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#2D2416',
    fontWeight: '500',
  },
  previewSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 10,
  },
  previewCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 8,
  },
  previewSavings: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonWrapper: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});