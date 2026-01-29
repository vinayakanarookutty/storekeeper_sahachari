import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getToken } from './services/auth';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width } = Dimensions.get('window');

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
  
  const product: Product = params.product ? JSON.parse(params.product as string) : null;
console.log(product)
  // Delete product mutation
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

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#2D2416" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <FontAwesome name="edit" size={24} color="#DAA520" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Image Gallery */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.imageGallery}
        >
          {product.images && product.images.length > 0 ? (
            product.images.map((imageKey, index) => (
              <Image
                key={index}
                source={{ uri: `${S3_BASE_URL}/${imageKey}` }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={styles.noImageContainer}>
              <FontAwesome name="image" size={64} color="#ccc" />
              <Text style={styles.noImageText}>No images</Text>
            </View>
          )}
        </ScrollView>

        {/* Image Counter */}
        {product.images && product.images.length > 1 && (
          <View style={styles.imageCounter}>
            <FontAwesome name="image" size={14} color="#666" />
            <Text style={styles.imageCounterText}>{product.images.length} photos</Text>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
            <View style={styles.stockBadge}>
              <FontAwesome name="cube" size={14} color="#666" />
              <Text style={styles.stockText}>Stock: {product.quantity}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.productDescription}>{product.description}</Text>

          <View style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButtonLarge} onPress={handleEdit}>
              <FontAwesome name="edit" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Product</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
              disabled={deleteProductMutation.isPending}
            >
              <FontAwesome name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C3',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageGallery: {
    height: 400,
  },
  productImage: {
    width: width,
    height: 400,
  },
  noImageContainer: {
    width: width,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noImageText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  imageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  imageCounterText: {
    fontSize: 14,
    color: '#666',
  },
  infoContainer: {
    padding: 20,
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  productPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DAA520',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    gap: 8,
  },
  stockText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0D6C3',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  editButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});