import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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
styles

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
                <Text style={styles.discountedPrice}>₹{discountedPrice}</Text>
                <Text style={styles.originalPriceText}>₹{numericPrice}</Text>
              </View>
            ) : (
              <Text style={styles.priceText}>₹{item.price}</Text>
            )}
          </View>

          {item.category !== 'Service' && (
  <View style={styles.cardFooter}>
    <View style={styles.stockInfo}>
      <FontAwesome name="cube" size={10} color="#856404" />
      <Text style={styles.stockText}>{item.quantity} in stock</Text>
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
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello Storekeeper,</Text>
            <Text style={styles.title}>My Inventory</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-product')}
          >
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>

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
            contentContainerStyle={styles.list}
            refreshing={isLoading}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerContainer}>
            <FontAwesome name="folder-open-o" size={60} color="#E0D6C3" />
            <Text style={styles.emptyText}>No products listed</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add-product')}>
              <Text style={styles.emptyButtonText}>Create your first product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
