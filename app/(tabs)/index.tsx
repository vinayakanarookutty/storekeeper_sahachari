// D:\storekeeper_sahachari\app\tabs\index.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getToken } from '../services/auth';
import { styles } from '../tab_style/index.style';
import { fetchItems, fetchMyRentals, fetchMyServices } from '../services/productApi';

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
  Modal,
  Alert,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

interface Offer {
  _id?: string;
  type: string;
  value: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

interface DisplayItem {
  _id: string;
  name: string;
  description: string;
  price?: string | number;
  rentalPrice?: number;
  quantity: number;
  category: string;
  images: string[];
  offers?: Offer[];
  unit?: string;
  itemType: 'product' | 'rent' | 'service';
}

export default function TabOneScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();

  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to keep the UI smooth during typing fast
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: userData } = useQuery<any>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const authToken = await getToken();
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: !!token,
  });

  const showStatusConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  const currentStatus = userData?.status || 'ACTIVE';
  const slideAnim = useRef(new Animated.Value(currentStatus === 'ACTIVE' ? 0 : 1)).current;

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'ACTIVE' | 'CLOSED') => {
      const authToken = await getToken();
      const res = await fetch(`${API_BASE_URL}/storekeeper/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update shop status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentStatus === 'ACTIVE' ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [currentStatus]);

  const { width } = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (width >= 1200) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  }, [width]);

  const cardWidth = useMemo(() => {
    const totalPadding = 40 + (numColumns - 1) * 15;
    const availableWidth = Math.min(width, 1200) - totalPadding;
    return availableWidth / numColumns;
  }, [width, numColumns]);

  // Unified background fetching layer mapping MongoDB APIs
  const { data: combinedItems, isLoading, refetch } = useQuery({
    queryKey: ['homeDashboardItems'],
    queryFn: async () => {
      const [products, rentals, services] = await Promise.all([
        fetchItems().catch(() => []),
        fetchMyRentals().catch(() => []),
        fetchMyServices().catch(() => []),
      ]);

      const taggedProducts = products.map((p: any) => ({ ...p, itemType: 'product' }));
      const taggedRentals = rentals.map((r: any) => ({ ...r, itemType: 'rent', category: 'Rent' }));
      const taggedServices = services.map((s: any) => ({ ...s, itemType: 'service', category: 'Service' }));

      return [...taggedProducts, ...taggedRentals, ...taggedServices] as DisplayItem[];
    },
    enabled: !!token,
  });

  // Processes filtering logic via reactive computed useMemo tracking debounced query strings
  const filteredItems = useMemo(() => {
    if (!combinedItems) return [];

    let items = [...combinedItems];

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      items = items.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }

    return items.sort((a, b) => {
      const priority = { product: 1, rent: 2, service: 3 };
      return priority[a.itemType] - priority[b.itemType];
    });
  }, [combinedItems, debouncedSearchQuery]);

  const handleItemPress = (item: DisplayItem) => {
    if (item.itemType === 'product') {
      router.push({
        pathname: '/product-detail',
        params: { product: JSON.stringify(item) },
      });
    } else if (item.itemType === 'rent') {
      router.push({
        pathname: '/rental-detail',
        params: { id: item._id },
      });
    } else {
      router.push({
        pathname: '/service-detail',
        params: { id: item._id },
      });
    }
  };

  const renderItemCard = ({ item }: { item: DisplayItem }) => {
    const getActiveOffer = () => {
      if (!item.offers || item.offers.length === 0) return null;

      const now = new Date();
      return item.offers.find(offer => {
        if (!offer.startDate || !offer.endDate) {
          return offer.isActive !== false;
        }
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        return now >= start && now <= end;
      });
    };

    const activeOffer = getActiveOffer();
    const baseRawPrice = item.itemType === 'rent' ? item.rentalPrice : item.price;
    const numericPrice = typeof baseRawPrice === 'string'
      ? parseFloat(baseRawPrice.replace(/[^0-9.]/g, ''))
      : baseRawPrice || 0;

    const priceString = String(baseRawPrice || '');

    const getTranslatedUnit = (rawPriceStr: string, specifiedUnit?: string) => {
      if (specifiedUnit) {
        const cleanUnit = specifiedUnit.toLowerCase();
        if (language === 'ml') {
          if (cleanUnit === 'hour') return '/മണിക്കൂർ';
          if (cleanUnit === 'day') return '/ദിവസം';
          if (cleanUnit === 'week') return '/ആഴ്ച';
          if (cleanUnit === 'month') return '/മാസം';
        }
        return `/${specifiedUnit.toLowerCase()}`;
      }

      if (!rawPriceStr.includes('/')) return '';
      const rawUnit = rawPriceStr.split('/')[1].trim().toLowerCase();

      if (language === 'ml') {
        if (['kg', 'kilogram'].includes(rawUnit)) return '/കിലോഗ്രാം';
        if (['grams', 'gram'].includes(rawUnit)) return '/ഗ്രാം';
        if (['liters', 'liter'].includes(rawUnit)) return '/ലിറ്റർ';
        if (['pcs', 'piece'].includes(rawUnit)) return '/എണ്ണം';
      }
      return '/' + rawPriceStr.split('/')[1].trim();
    };

    const priceUnit = getTranslatedUnit(priceString, item.unit);

    const discountedPrice = activeOffer
      ? activeOffer.type === 'FLAT'
        ? Math.round(numericPrice - activeOffer.value)
        : Math.round(numericPrice - (numericPrice * activeOffer.value / 100))
      : null;

    const getTranslatedCategory = (cat: string) => {
      if (!cat) return '';
      const normalized = cat.toLowerCase().trim().replace(/\s+/g, '');
      if (language === 'ml') {
        if (normalized === 'service') return 'സേവനം';
        if (normalized === 'rent') return 'വാടകയ്ക്ക്';
      } else {
        if (normalized === 'service') return 'Service';
        if (normalized === 'rent') return 'Rent Item';
      }
      return (t as any)[normalized] || cat;
    };

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.imageWrapper, { height: cardWidth }]}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0].startsWith('http') ? item.images[0] : `${S3_BASE_URL}/${item.images[0]}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <FontAwesome name="image" size={30} color="#E0D6C3" />
            </View>
          )}

          {activeOffer && (
            <View style={[styles.offerBadge, { position: 'absolute', top: 10, left: 10, zIndex: 999 }]}>
              <Text style={styles.offerBadgeText}>
                {activeOffer.type === 'FLAT' ? `₹${activeOffer.value}` : `${activeOffer.value}%`} OFF
              </Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {getTranslatedCategory(item.category)}
          </Text>

          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>

          <View style={styles.priceRow}>
            {activeOffer ? (
              <View style={styles.priceContainer}>
                <Text style={styles.discountedPrice}>₹{discountedPrice}{priceUnit}</Text>
                <Text style={styles.originalPriceText}>₹{numericPrice}{priceUnit}</Text>
              </View>
            ) : (
              <Text style={styles.priceText}>
                ₹{numericPrice}{priceUnit}
              </Text>
            )}
          </View>

          {item.itemType !== 'service' && (
            <View style={styles.cardFooter}>
              <View style={styles.stockInfo}>
                <FontAwesome name="cube" size={10} color="#D97706" />
                <Text style={styles.stockText}>
                  {item.quantity} {item.itemType === 'rent' ? 'Available' : t.inStock}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const statusText = currentStatus === 'ACTIVE' ? 'Active' : 'Closed';

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthWrapper}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            key={numColumns}
            data={filteredItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => `${item.itemType}_${item._id}`}
            numColumns={numColumns}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.list}

            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"

            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                tintColor="#2563EB"
                colors={["#2563EB"]}
              />
            }

            showsVerticalScrollIndicator={false}

            // FIX: Rendered inline directly to prevent unmounting/keyboard dismissal issues
            ListHeaderComponent={
              <View style={{ backgroundColor: '#FDFCF7' }}>
                <LinearGradient
                  colors={['#DAA520', '#F4C430']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.headerGradient}
                >
                  <View style={styles.headerTopRow}>
                    <View style={styles.headerLeft}>
                      <Text style={styles.title} numberOfLines={1}>{t.sahachari}</Text>
                      <View style={styles.subtitleContainer}>
                        <View style={styles.headerLineAccent} />
                        <Text style={styles.subtitleText} numberOfLines={1}>
                          {`${t.myStore} (${statusText})`}
                        </Text>
                      </View>

                      <View style={styles.languageToggleContainer}>
                        <View style={styles.languageToggle}>
                          {toggleStatusMutation.isPending ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            </View>
                          ) : (
                            <>
                              <Animated.View
                                style={[styles.toggleSlider, {
                                  transform: [{
                                    translateX: slideAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, 42],
                                    }),
                                  }],
                                }]}
                              />
                              <TouchableOpacity style={styles.langButton} onPress={() => {
                                showStatusConfirm('Open Shop?', 'Are you sure you want to open?', () => toggleStatusMutation.mutate('ACTIVE'));
                              }}>
                                <Text style={currentStatus === 'ACTIVE' ? styles.langTextActive : styles.langText}>ON</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.langButton} onPress={() => {
                                showStatusConfirm('Close Shop?', 'Are you sure you want to close?', () => toggleStatusMutation.mutate('CLOSED'));
                              }}>
                                <Text style={currentStatus === 'CLOSED' ? styles.langTextActive : styles.langText}>OFF</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.headerRightActions}>
                      <TouchableOpacity 
                        style={styles.logoutIconButton}
                        activeOpacity={0.8} 
                        onPress={() => {
                          refetch();
                          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
                        }}
                      >
                        <FontAwesome name="refresh" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/two')}>
                        <Image
                          source={{ uri: userData?.image ? `${S3_BASE_URL}/${userData.image}` : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' }}
                          style={styles.avatarImage}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 2, marginTop: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFF',
                      borderWidth: 1,
                      borderColor: '#E6DCB8',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      minHeight: 48,
                      zIndex: 999,
                      elevation: 5,
                    }}
                  >
                    <FontAwesome name="search" size={16} color="#A89378" style={{ marginRight: 8 }} />
                    <TextInput
                      style={{
                        flex: 1,
                        color: '#2D2416',
                        fontSize: 15,
                        paddingVertical: 8,
                      }}
                      placeholder="Search products, services, rentals..."
                      placeholderTextColor="#A89378"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      clearButtonMode="while-editing"

                      autoCorrect={false}
                      autoCapitalize="none"
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.bulkButton} onPress={() => router.push('/bulk-upload')}>
                      <FontAwesome name="upload" size={14} color="#fff" />
                      <Text style={styles.buttonText} numberOfLines={1}>{t.bulkUpload}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.addButton} onPress={() => setBottomSheetOpen(true)}>
                      <FontAwesome name="plus" size={14} color="#fff" />
                      <Text style={styles.buttonText} numberOfLines={1}>{t.addItem || 'Add Item'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.centerContainer, { marginTop: 40 }]}>
                <FontAwesome name="folder-open-o" size={60} color="#E0D6C3" />
                <Text style={styles.emptyText}>No matches found</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal animationType="slide" transparent={true} visible={bottomSheetOpen} onRequestClose={() => setBottomSheetOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setBottomSheetOpen(false)}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '50%', width: '100%' }} onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EFEFEF' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111' }}>Select Category</Text>
              <TouchableOpacity onPress={() => setBottomSheetOpen(false)} style={{ padding: 4 }}>
                <FontAwesome name="times" size={18} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 15 }}>
              <TouchableOpacity style={{ paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }} onPress={() => { setBottomSheetOpen(false); router.push('/add-product'); }}>
                <Text style={{ color: '#111', fontSize: 16, fontWeight: '400' }}>{t.addProduct || 'Add Product'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }} onPress={() => { setBottomSheetOpen(false); router.push({ pathname: '/add-service', params: { initialCategory: 'Service' } }); }}>
                <Text style={{ color: '#111', fontSize: 16, fontWeight: '400' }}>Add Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }} onPress={() => { setBottomSheetOpen(false); router.push({ pathname: '/add-rent', params: { initialCategory: 'Rent' } }); }}>
                <Text style={{ color: '#111', fontSize: 16, fontWeight: '400' }}>Add Rent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}