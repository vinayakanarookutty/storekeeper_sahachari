import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient'; 
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';
import { styles } from '../tab_style/index.style';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

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
  price: string | number;
  quantity: number;
  category: string;
  images: string[];
  offers?: Offer[];
}

export default function TabOneScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;

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

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: language === 'en' ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [language]);

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

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/products`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json() as Promise<Product[]>;
    },
    enabled: !!token,
  });

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product-detail',
      params: { product: JSON.stringify(product) },
    });
  };

  const renderHeader = () => {
    return (
      <View style={{ backgroundColor: '#FDFCF7' }}>
        <LinearGradient 
          colors={['#DAA520', '#F4C430']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title} numberOfLines={1}>
                {t.sahachari}
              </Text>
              <View style={styles.subtitleContainer}>
                <View style={styles.headerLineAccent} />
                <Text style={styles.subtitleText} numberOfLines={1}>
                   {t.myStore}
                </Text>
              </View>
              
              <View style={styles.languageToggleContainer}>
                <View style={styles.languageToggle}>
                  <Animated.View
                    style={[
                      styles.toggleSlider,
                      {
                        transform: [
                          {
                            translateX: slideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 42],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  <TouchableOpacity style={styles.langButton} onPress={() => setLanguage('en')}>
                    <Text style={language === 'en' ? styles.langTextActive : styles.langText}>EN</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.langButton} onPress={() => setLanguage('ml')}>
                    <Text style={language === 'ml' ? styles.langTextActive : styles.langText}>മ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/two')} 
                style={styles.avatarContainer}
              >
                <Image 
                  source={{ 
                    uri: userData?.image 
                      ? `${S3_BASE_URL}/${userData.image}` 
                      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' 
                  }} 
                  style={styles.avatarImage} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.bulkButton} onPress={() => router.push('/bulk-upload')}>
              <FontAwesome name="upload" size={14} color="#fff" />
              <Text style={styles.buttonText} numberOfLines={1}>
                {t.bulkUpload}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-product')}>
              <FontAwesome name="plus" size={14} color="#fff" />
              <Text style={styles.buttonText} numberOfLines={1}>
                {t.addProduct}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const getActiveOffer = () => {
      if (!item.offers || item.offers.length === 0) return null;
      const now = new Date();
      return item.offers.find(offer => {
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        return now >= start && now <= end;
      });
    };

    const activeOffer = getActiveOffer();
    const numericPrice = typeof item.price === 'string'
      ? parseFloat(item.price.replace(/[^0-9.]/g, ''))
      : item.price;

    const priceString = String(item.price);
    
    // ─── DYNAMIC EXPLICIT UNIT LOCALIZER ───
    const getTranslatedUnit = (rawPriceStr: string) => {
      if (!rawPriceStr.includes('/')) return '';
      
      const rawUnit = rawPriceStr.split('/')[1].trim().toLowerCase();
      
      if (language === 'ml') {
        if (rawUnit === 'kg' || rawUnit === 'kilogram' || rawUnit === 'കിലോലോഗ്രാം') return '/കിലോഗ്രാം';
        if (rawUnit === 'grams' || rawUnit === 'gram' || rawUnit === 'ഗ്രാം') return '/ഗ്രാം';
        if (rawUnit === 'liters' || rawUnit === 'liter' || rawUnit === 'ലിറ്റർ') return '/ലിറ്റർ';
        if (rawUnit === 'ml' || rawUnit === 'milliliter' || rawUnit === 'മില്ലിലിറ്റർ') return '/മില്ലിലിറ്റർ';
        if (rawUnit === 'pcs' || rawUnit === 'piece' || rawUnit === 'എണ്ണം') return '/എണ്ണം';
        if (rawUnit === 'packet' || rawUnit === 'pkt' || rawUnit === 'പാക്കറ്റ്') return '/പാക്കറ്റ്';
        if (rawUnit === 'bottle' || rawUnit === 'കുപ്പി') return '/കുപ്പി';
        if (rawUnit === 'hour' || rawUnit === 'മണിക്കൂർ') return '/മണിക്കൂർ';
        if (rawUnit === 'box' || rawUnit === 'പെട്ടി') return '/പെട്ടി';
      }
      
      // Fallback to original English unit string if language is 'en' or untranslated
      return '/' + rawPriceStr.split('/')[1].trim();
    };

    const priceUnit = getTranslatedUnit(priceString);

    const discountedPrice = activeOffer
      ? Math.round(numericPrice - (numericPrice * activeOffer.value / 100))
      : null;

    // ─── BULLETPROOF EXPLICIT DYNAMIC LOCALIZER ───
    const getTranslatedCategory = (category: string) => {
      if (!category) return '';
      
      const normalized = category.toLowerCase().trim().replace(/\s+/g, '');

      if (language === 'ml') {
        if (normalized === 'fastfood' || normalized === 'ഫാസ്റ്റ്ഫുഡ്') return 'ഫാസ്റ്റ് ഫുഡ്';
        if (normalized === 'snacks' || normalized === 'സ്നാക്ക്സ്' || normalized === 'സ്നാക്സ്') return 'സ്നാക്ക്സ്';
        if (normalized === 'food' || normalized === 'ഭക്ഷണം') return 'ഭക്ഷണം';
        if (normalized === 'service' || normalized === 'സേവനം') return 'സേവനം';
        if (normalized === 'drinks' || normalized === 'പാനീയങ്ങൾ') return 'പാനീയങ്ങൾ';
        if (normalized === 'homemade' || normalized === 'ഹോംമേഡ്') return 'ഹോം മെയ്ഡ്';
        
        if (normalized.includes('vegetable') || normalized.includes('fruit') || normalized === 'പച്ചക്കറികളുംപഴങ്ങളും') {
          return 'പച്ചക്കറികളും പഴങ്ങളും';
        }
      } else {
        if (normalized === 'fastfood' || normalized === 'ഫാസ്റ്റ്ഫുഡ്') return 'Fast Food';
        if (normalized === 'snacks' || normalized === 'സ്നാക്ക്സ്' || normalized === 'സ്നാക്സ്') return 'Snacks';
        if (normalized === 'food' || normalized === 'ഭക്ഷണം') return 'Food';
        if (normalized === 'service' || normalized === 'സേവനം') return 'Service';
        if (normalized === 'drinks' || normalized === 'പാനീയങ്ങൾ') return 'Drinks';
        if (normalized === 'homemade' || normalized === 'ഹോംമേഡ്') return 'Home Made';
        
        if (normalized.includes('vegetable') || normalized.includes('fruit') || normalized === 'പച്ചക്കറികളുംപഴങ്ങളും') {
          return 'Vegetables and Fruits';
        }
      }

      return (t as any)[normalized] || category;
    };

    const translatedCategory = getTranslatedCategory(item.category);

    // Dynamic localization fallback strategy for single base values without slash structures
    const renderBasePriceText = () => {
      if (!priceString.includes('/')) {
        return `₹${item.price}`;
      }
      return `₹${numericPrice}${priceUnit}`;
    };

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}
      >
       <View style={[styles.imageWrapper, { height: cardWidth }]}>
  {item.images && item.images.length > 0 ? (
    <Image
      source={{
        uri: item.images[0].startsWith('http') 
          ? item.images[0] 
          : `${S3_BASE_URL}/${item.images[0]}`
      }}
      style={styles.productImage}
      resizeMode="cover"
    />
  ) : (
    <View style={styles.noImagePlaceholder}>
      <FontAwesome name="image" size={30} color="#E0D6C3" />
    </View>
  )}

          {activeOffer && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{activeOffer.value}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {translatedCategory}
          </Text>
          
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>

          <View style={styles.priceRow}>
            {activeOffer ? (
              <View style={styles.priceContainer}>
                <Text style={styles.discountedPrice}>
                  ₹{discountedPrice}{priceUnit}
                </Text>
                <Text style={styles.originalPriceText}>
                  ₹{numericPrice}{priceUnit}
                </Text>
              </View>
            ) : (
              <Text style={styles.priceText}>{renderBasePriceText()}</Text>
            )}
          </View>

          {item.category !== 'Service' && (
            <View style={styles.cardFooter}>
              <View style={styles.stockInfo}>
                <FontAwesome name="cube" size={10} color="#D97706" />
                <Text style={styles.stockText}>
                  {item.quantity} {t.inStock}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthWrapper}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : products && products.length > 0 ? (
          <FlatList
            key={numColumns}
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={numColumns}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                tintColor="#2563EB"
                colors={["#2563EB"]}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderHeader}
          />
        ) : (
          <View style={{ flex: 1 }}>
            {renderHeader()}
            <View style={[styles.centerContainer, { marginTop: 40 }]}>
              <FontAwesome name="folder-open-o" size={60} color="#E0D6C3" />
              <Text style={styles.emptyText}>{t.noProducts}</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add-product')}>
                <Text style={styles.emptyButtonText}>{t.createFirstProduct}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}