import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Text, 
  ActivityIndicator,
  useWindowDimensions,
  Platform
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  category: string;
  images: string[];
}

export default function TabOneScreen() {
  const { token } = useAuth();
  const router = useRouter();
  
  // 1. Get dynamic window width
  const { width } = useWindowDimensions();

  // 2. Calculate columns dynamically based on width
  // Mobile: 2 columns, Tablet: 3 columns, Desktop: 4+ columns
  const numColumns = useMemo(() => {
    if (width >= 1200) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  }, [width]);

  // 3. Calculate card width based on current columns and horizontal padding
  const cardWidth = useMemo(() => {
    const totalPadding = 40 + (numColumns - 1) * 15; // padding + gaps
    const availableWidth = Math.min(width, 1200) - totalPadding; // Caps content width at 1200px
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

  const renderProduct = ({ item }: { item: Product }) => (
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
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>₹{item.price}</Text>
        </View>
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.stockInfo}>
            <FontAwesome name="cube" size={10} color="#856404" />
            <Text style={styles.stockText}>{item.quantity} left</Text>
          </View>
          <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 4. Wrapped Header in a Max-Width container for Web */}
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
            <FontAwesome name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DAA520" />
          </View>
        ) : products && products.length > 0 ? (
          <FlatList
            key={numColumns} // Force re-render when columns change
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
    alignItems: 'center', // Centers content on wide screens
  },
  maxWidthWrapper: {
    width: '100%',
    maxWidth: 1200, // Keeps the UI from stretching too wide on 4k monitors
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#FFF9E6',
  },
  welcomeText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#DAA520',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#DAA520', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
      android: { elevation: 4 },
      web: { cursor: 'pointer', transition: 'all 0.2s ease' }
    }),
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  columnWrapper: {
    justifyContent: 'flex-start', // Better for grids when the last row is incomplete
    gap: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D6C3',
    ...Platform.select({
      web: { 
        transition: 'transform 0.2s ease-in-out',
        outlineStyle: 'none'
      },
      android: { elevation: 3 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 }
    }),
  },
  imageWrapper: {
    backgroundColor: '#FDFCF0',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#DAA520',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 10,
    color: '#A89378',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#A89378',
    marginTop: 15,
    fontWeight: '500',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DAA520',
  },
  emptyButtonText: {
    color: '#DAA520',
    fontWeight: '600',
  },
});