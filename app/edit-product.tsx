import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getToken } from './services/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface PresignedUrlResponse {
  url: string;
  key: string;
}

interface ProductData {
  name: string;
  description: string;
  price: string;
  quantity: number;
  category: string;
  images: string[];
}

export default function EditProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse product data from params
  const productData = params.product ? JSON.parse(params.product as string) : null;
  
  const [name, setName] = useState(productData?.name || '');
  const [description, setDescription] = useState(productData?.description || '');
  const [price, setPrice] = useState(productData?.price?.toString() || '');
  const [quantity, setQuantity] = useState(productData?.quantity?.toString() || '');
  const [category, setCategory] = useState(productData?.category || '');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(productData?.images || []);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (productData: ProductData) => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update product');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Product updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', params.id] });
            router.back();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update product');
    },
  });

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeNewImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('Error', 'No new images to upload');
      return;
    }

    setIsUploading(true);
    const imageKeys: string[] = [];

    try {
      const token = await getToken();

      for (const imageUri of selectedImages) {
        const fileExtension = imageUri.split('.').pop() || 'jpg';
        const fileName = `product_${Date.now()}.${fileExtension}`;
        const fileType = `image/${fileExtension}`;

        const presignedResponse = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName,
            fileType,
            folder: 'uploads',
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error('Failed to get presigned URL');
        }

        const { url: presignedUrl, key }: PresignedUrlResponse = await presignedResponse.json();

        const imageResponse = await fetch(imageUri);
        const blob = await imageResponse.blob();

        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileType,
          },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        imageKeys.push(key);
      }

      setUploadedImageKeys(imageKeys);
      Alert.alert('Success', `${imageKeys.length} new image(s) uploaded!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProduct = () => {
    if (!name.trim() || !description.trim() || !price || !quantity || !category.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const allImages = [...existingImages, ...uploadedImageKeys];

    if (allImages.length === 0) {
      Alert.alert('Error', 'Product must have at least one image');
      return;
    }

    const productData: ProductData = {
      name,
      description,
      price: price,
      quantity: parseInt(quantity),
      category,
      images: allImages,
    };

    updateProductMutation.mutate(productData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Product Name *"
          placeholderTextColor="#A89378"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *"
          placeholderTextColor="#A89378"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TextInput
          style={styles.input}
          placeholder="Price *"
          placeholderTextColor="#A89378"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Quantity *"
          placeholderTextColor="#A89378"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Category *"
          placeholderTextColor="#A89378"
          value={category}
          onChangeText={setCategory}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Current Images</Text>
              <View style={styles.imagesContainer}>
                {existingImages.map((imageKey, index) => (
                  <View key={`existing-${index}`} style={styles.imageWrapper}>
                    <Image 
                      source={{ uri: `${API_BASE_URL}/${imageKey}` }} 
                      style={styles.imagePreview} 
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeExistingImage(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}
          
          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="image" size={24} color="#DAA520" />
            <Text style={styles.pickButtonText}>Add More Images</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>New Images</Text>
              <View style={styles.imagesContainer}>
                {selectedImages.map((uri, index) => (
                  <View key={`new-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeNewImage(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {selectedImages.length > 0 && uploadedImageKeys.length === 0 && (
            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.buttonDisabled]}
              onPress={uploadImages}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload New Images</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {uploadedImageKeys.length > 0 && (
            <View style={styles.uploadStatus}>
              <FontAwesome name="check-circle" size={20} color="#2E7D32" />
              <Text style={styles.uploadStatusText}>
                {uploadedImageKeys.length} new image(s) uploaded
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, updateProductMutation.isPending && styles.buttonDisabled]}
          onPress={handleUpdateProduct}
          disabled={updateProductMutation.isPending}
        >
          {updateProductMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Update Product</Text>
          )}
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    color: '#2D2416',
  },
  textArea: {
    minHeight: 100,
  },
  section: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  pickButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DAA520',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  pickButtonText: {
    color: '#DAA520',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D6C3',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadStatus: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadStatusText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#DAA520',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});