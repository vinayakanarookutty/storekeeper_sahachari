import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryInputFocused, setCategoryInputFocused] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const PRODUCT_CATEGORIES = [
    'Service',
    'Electronics',
    'Clothing & Apparel',
    'Home & Garden',
    'Sports & Outdoors',
    'Books & Media',
    'Toys & Games',
    'Food & Beverages',
    'Health & Beauty',
    'Automotive',
    'Jewelry & Accessories',
    'Pet Supplies',
    'Office Supplies',
    'Tools & Hardware',
    'Art & Crafts',
    'Musical Instruments',
    'Others'
  ];

  const categories = PRODUCT_CATEGORIES;

  // Check if selected category is Service
  const isService = category === 'Service';

  // Filter categories based on user input
  const filteredCategories = useMemo(() => {
    if (!category) return categories;
    return categories.filter(cat => 
      cat.toLowerCase().includes(category.toLowerCase())
    );
  }, [category, categories]);

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
      Alert.alert('Success', isService ? 'Service created successfully!' : 'Product created successfully!', [
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
      Alert.alert('Error', error.message || `Failed to create ${isService ? 'service' : 'product'}`);
    },
  });

  const handleSelectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategoryDropdown(false);
    // Reset quantity when switching to/from Service
    if (selectedCategory === 'Service') {
      setQuantity('100');
    } else if (category === 'Service') {
      setQuantity('');
    }
  };

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
    if (!category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!name.trim() || !description.trim() || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // For non-service categories, quantity is required
    if (!isService && !quantity) {
      Alert.alert('Error', 'Please enter the quantity');
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
      quantity: isService ? 100 : parseInt(quantity),
      category,
      images: uploadedImageKeys,
    };

    createProductMutation.mutate(productData);
  };

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isService ? 'Add New Service' : 'Add New Product'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* CATEGORY FIELD - NOW FIRST */}
        <View style={styles.autocompleteContainer}>
          <TextInput
            style={styles.input}
            placeholder="Category * (Select: Service or Other)"
            placeholderTextColor="#A89378"
            value={category}
            onChangeText={(text) => {
              setCategory(text);
              setShowCategoryDropdown(true);
            }}
            onFocus={() => {
              setCategoryInputFocused(true);
              setShowCategoryDropdown(true);
            }}
            onBlur={() => {
              // Delay to allow selecting from dropdown
              setTimeout(() => setCategoryInputFocused(false), 200);
            }}
          />
          
          {showCategoryDropdown && categoryInputFocused && filteredCategories.length > 0 && (
            <View style={styles.dropdown}>
              <ScrollView 
                style={styles.dropdownScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {filteredCategories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <Text style={styles.fieldHint}>
          {isService 
            ? 'Service category selected - quantity will be set to 100 automatically'
            : 'Select the category of your product'}
        </Text>

        {/* NAME FIELD */}
        <TextInput
          style={styles.input}
          placeholder={isService ? "Service Name *" : "Product Name *"}
          placeholderTextColor="#A89378"
          value={name}
          onChangeText={setName}
        />

        {/* DESCRIPTION FIELD */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={isService ? "Service Description *" : "Product Description *"}
          placeholderTextColor="#A89378"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* PRICE FIELD */}
        <TextInput
          style={styles.input}
          placeholder={isService ? "Service Price *" : "Price *"}
          placeholderTextColor="#A89378"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* QUANTITY FIELD - ONLY SHOW FOR NON-SERVICE */}
        {!isService && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Quantity *"
              placeholderTextColor="#A89378"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <Text style={styles.fieldHint}>
              Enter how many items are available in stock
            </Text>
          </>
        )}

        {/* IMAGES SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isService ? 'Service Images' : 'Product Images'}</Text>
          
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

        {/* CREATE BUTTON */}
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
            <Text style={styles.createButtonText}>
              {isService ? 'Create Service' : 'Create Product'}
            </Text>
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
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 16,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2D2416',
  },
  fieldHint: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 8,
    marginTop: -6,
  }
});