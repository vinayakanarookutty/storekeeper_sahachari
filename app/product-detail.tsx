import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getToken } from './services/auth';

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width, height } = Dimensions.get('window');

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  images: string[];
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const product: Product = params.product ? JSON.parse(params.product as string) : null;

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

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
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
                </View>
              ))
            ) : (
              <View style={styles.noImageContainer}>
                <FontAwesome name="image" size={80} color="#DAA520" />
                <Text style={styles.noImageText}>No images available</Text>
              </View>
            )}
          </ScrollView>

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
          {/* Category & Stock */}
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
          
          {/* Price */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>₹</Text>
              <Text style={styles.productPrice}>{product.price.toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.priceLabel}>Price per unit</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="align-left" size={16} color="#2D2416" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.productDescription}>{product.description}</Text>
          </View>

          {/* Product Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <FontAwesome name="rupee" size={24} color="#DAA520" />
              <Text style={styles.statValue}>₹{(product.price * product.quantity).toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Total Value</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <FontAwesome name="cubes" size={24} color="#4A90E2" />
              <Text style={styles.statValue}>{product.quantity}</Text>
              <Text style={styles.statLabel}>Units Available</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for fixed buttons */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity 
          style={styles.editButtonLarge} 
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <FontAwesome name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Product</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
          disabled={deleteProductMutation.isPending}
          activeOpacity={0.8}
        >
          <FontAwesome name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
    shadowOpacity: 0.1,
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
  },
  imageCountBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    backgroundColor: '#FFF9E6',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DAA520',
    marginRight: 4,
  },
  productPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#DAA520',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2416',
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 26,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
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
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0D6C3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  editButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DAA520',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: 56,
    height: 56,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});