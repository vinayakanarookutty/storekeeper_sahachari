import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';
import { styles } from '../tab_style/index.style';

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

  // CLEANED WORKFLOW HEADER DESIGN INCORPORATED INTO FLATLIST TRACK
  const renderHeader = () => {
    return (
      <View style={[styles.header, { paddingTop: 5, paddingBottom: 10 }]}>
        {/* Title Header Wrapper Row - Decreased height and lifted contents */}
        <View style={{ position: 'relative', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 45 }}>
          <View style={{ paddingRight: 90, justifyContent: 'center' }}>
            <Text style={[styles.title, { marginTop: 0, lineHeight: 34 }]}>
              {t.myInventory}
            </Text>
          </View>

          {/* Absolute Positioned Language Toggle capsule - Lifted right into the center of the row track */}
          <View style={[styles.languageToggleContainer, { position: 'absolute', right: 0, top: 4 }]}>
            <View style={styles.languageToggle}>
              <Animated.View
                style={[
                  styles.toggleSlider,
                  {
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 44],
                        }),
                      },
                    ],
                  },
                ]}
              />

              <TouchableOpacity
                style={styles.langButton}
                onPress={() => setLanguage('en')}
              >
                <Text style={language === 'en' ? styles.langTextActive : styles.langText}>
                  EN
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.langButton}
                onPress={() => setLanguage('ml')}
              >
                <Text style={language === 'ml' ? styles.langTextActive : styles.langText}>
                  മ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Button Grid - Dynamically formatted 50/50 flex distribution layout with tightened top margin */}
        <View style={[styles.actionButtons, { flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }]}>
          <TouchableOpacity
            style={[styles.bulkButton, { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 6 }]}
            onPress={() => router.push('/bulk-upload')}
          >
            <FontAwesome name="upload" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit>
              {t.bulkUpload}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginLeft: 6 }]}
            onPress={() => router.push('/add-product')}
          >
            <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit>
              {t.addProduct}
            </Text>
          </TouchableOpacity>
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

    const priceUnit = priceString.includes('/')
      ? '/' + priceString.split('/')[1].trim()
      : '';

    const discountedPrice = activeOffer
      ? Math.round(numericPrice - (numericPrice * activeOffer.value / 100))
      : null;

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.imageWrapper, { height: cardWidth }]}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: `${S3_BASE_URL}/${item.images[0]}` }}
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
          <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
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
              <Text style={styles.priceText}>₹{item.price}</Text>
            )}
          </View>

          {item.category !== 'Service' && (
            <View style={styles.cardFooter}>
              <View style={styles.stockInfo}>
                <FontAwesome name="cube" size={10} color="#856404" />
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
            <ActivityIndicator size="large" color="#DAA520" />
          </View>
        ) : products && products.length > 0 ? (
          <FlatList
            key={numColumns}
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={numColumns}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[styles.list, { paddingBottom: 80 }]} // Extra padding so bottom items aren't obscured by the tab bar
            refreshControl={
              <React.Fragment>
                {/* Fallback pattern context container if platform rendering is required */}
              </React.Fragment>
            }
            refreshing={isLoading}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
            
            // ATTACH THE HEADERS DIRECTLY TO THE SCROLL FLOW CAPABILITY HERE:
            ListHeaderComponent={renderHeader}
          />
        ) : (
          <View style={{ flex: 1 }}>
            {/* If there are no products, render the header on top of the empty information card */}
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