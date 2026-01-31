import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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

export default function AddProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductData) => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create product');
      }

      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Product created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            router.back(); // Go back to product list
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create product');
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

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };

//   const uploadImages = async () => {
//     if (selectedImages.length === 0) {
//       Alert.alert('Error', 'Please select at least one image');
//       return;
//     }

//     setIsUploading(true);
//     const imageKeys: string[] = [];

//     try {
//       const token = await getToken();

//       for (const imageUri of selectedImages) {
//         const fileExtension = imageUri.split('.').pop() || 'jpg';
//         const fileName = `product_${Date.now()}.${fileExtension}`;
//         const fileType = `image/${fileExtension}`;

//         // Get presigned URL
//         const presignedResponse = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             fileName,
//             fileType,
//             folder: 'uploads',
//           }),
//         });

//         if (!presignedResponse.ok) {
//           throw new Error('Failed to get presigned URL');
//         }

//         const { url: presignedUrl, key }: PresignedUrlResponse = await presignedResponse.json();

//         // Upload to S3
//         const imageResponse = await fetch(imageUri);
//         const blob = await imageResponse.blob();

//         const uploadResponse = await fetch(presignedUrl, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': fileType,
//           },
//           body: blob,
//         });

//         if (!uploadResponse.ok) {
//           throw new Error('Failed to upload image');
//         }

//         imageKeys.push(key);
//       }

//       setUploadedImageKeys(imageKeys);
//       Alert.alert('Success', `${imageKeys.length} image(s) uploaded successfully!`);
//     } catch (error: any) {
//       console.error('Upload error:', error);
//       Alert.alert('Upload Failed', error.message || 'Failed to upload images');
//     } finally {
//       setIsUploading(false);
//     }
//   };
const uploadImages = async () => {
  if (selectedImages.length === 0) {
    Alert.alert('Error', 'Please select at least one image');
    return;
  }

  setIsUploading(true);
  const imageKeys: string[] = [];

  try {
    const token = await getToken();

    for (const imageUri of selectedImages) {
      // 1. STRIP METADATA: Remove 'blob:', ':http', and query params
      // This prevents S3 from creating "http:" folders
      let cleanPath = imageUri.split(':http')[0]; // Remove local server reference
      cleanPath = cleanPath.replace('blob:', ''); // Remove blob prefix
      
      // 2. EXTRACT EXTENSION
      const extensionMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
      const fileExtension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
      
      // 3. GENERATE CLEAN FILENAME
      // Using a random string + timestamp for uniqueness
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `product_${Date.now()}_${randomId}.${fileExtension}`;
      
      // 4. SET VALID MIME TYPE
      const fileType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

      console.log(`Uploading: ${fileName} as ${fileType}`);

      // 5. GET PRESIGNED URL FROM BACKEND
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

      if (!presignedResponse.ok) throw new Error('Failed to get presigned URL');

      const { url: presignedUrl, key }: PresignedUrlResponse = await presignedResponse.json();

      // 6. CONVERT URI TO BLOB
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      // 7. UPLOAD DIRECTLY TO S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType, // Essential for S3 to recognize it as an image
        },
        body: blob,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload image to S3');

      // Save the key (e.g., "uploads/product_123.jpg") to push to your DB later
      imageKeys.push(key);
    }

    setUploadedImageKeys(imageKeys);
    Alert.alert('Success', `${imageKeys.length} image(s) uploaded successfully!`);
  } catch (error: any) {
    console.error('Upload error details:', error);
    Alert.alert('Upload Failed', error.message || 'Check console for details');
  } finally {
    setIsUploading(false);
  }
};

  const handleCreateProduct = () => {
    if (!name.trim() || !description.trim() || !price || !quantity || !category.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (uploadedImageKeys.length === 0) {
      Alert.alert('Error', 'Please upload at least one image');
      return;
    }

    const productData: ProductData = {
      name,
      description,
      price: price,
      quantity: parseInt(quantity),
      category,
      images: uploadedImageKeys,
    };

    createProductMutation.mutate(productData);
  };

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Product</Text>
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
          placeholder="Category * (e.g., Electronics)"
          placeholderTextColor="#A89378"
          value={category}
          onChangeText={setCategory}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          
          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="image" size={24} color="#DAA520" />
            <Text style={styles.pickButtonText}>Pick Images from Gallery</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <View style={styles.imagesContainer}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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
                  <Text style={styles.uploadButtonText}>Upload Images</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {uploadedImageKeys.length > 0 && (
            <View style={styles.uploadStatus}>
              <FontAwesome name="check-circle" size={20} color="#2E7D32" />
              <Text style={styles.uploadStatusText}>
                {uploadedImageKeys.length} image(s) uploaded
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            (createProductMutation.isPending || uploadedImageKeys.length === 0) && styles.buttonDisabled
          ]}
          onPress={handleCreateProduct}
          disabled={createProductMutation.isPending || uploadedImageKeys.length === 0}
        >
          {createProductMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Product</Text>
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
  pickButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DAA520',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pickButtonText: {
    color: '#DAA520',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
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