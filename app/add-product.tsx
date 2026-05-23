import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { styles } from './styles/add-edit-common.style';
import { getToken } from './services/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Add below API_BASE_URL
const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(title, message, onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined);
  }
};

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

const PRODUCT_CATEGORIES = [
  'Food',
  'Vegetables and Fruits',
  'Groceries',
  'Home Made',
  'Service',
  'Fish & Meat',
  'Rent'
];

const UNITS = ['kg', 'grams', 'liters', 'ml', 'pcs', 'packet', 'box'];
const RENT_UNITS = ['Hour', 'Day', 'Week', 'Month'];
const SERVICE_UNITS = ['Hour', 'Day', 'Service']; // Units specifically for services

export default function AddProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [serviceUnit, setServiceUnit] = useState('Hour'); // State for Service/Rent duration
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // MODAL STATES
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showServiceUnitModal, setShowServiceUnitModal] = useState(false);

  const isService = category === 'Service';
  const isRent = category === 'Rent';
  // Check if current category needs a time-based unit
  const needsTimeUnit = isService || isRent;

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
      showAlert('Success', 'Created successfully!', () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to create item');
    },
  });

  const handleSelectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategoryModal(false);
    
    if (selectedCategory === 'Service') {
      setQuantity('1'); // Default quantity for service
      setServiceUnit('Hour');
    } else if (selectedCategory === 'Rent') {
      setUnit('unit');
      setQuantity('');
      setServiceUnit('Day');
    } else {
      setUnit('kg');
      setQuantity('');
    }
  };

 const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Please grant permission to access photos');
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
      showAlert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };
const uploadImages = async () => {
    if (selectedImages.length === 0) {
      showAlert('Error', 'Please select at least one image');
      return;
    }
    setIsUploading(true);
    const imageKeys: string[] = [];
    
    try {
      const token = await getToken();
      for (const imageUri of selectedImages) {
        let fileExtension = 'jpg';
        let fileType = 'image/jpeg';

        if (Platform.OS === 'web') {
          // Web images often come with layout indicators or header types embedded
          if (imageUri.includes('image/png') || imageUri.endsWith('.png')) {
            fileExtension = 'png';
            fileType = 'image/png';
          }
        } else {
          const cleanPath = imageUri.split(':http')[0].replace('blob:', '');
          const extensionMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
          if (extensionMatch) {
            fileExtension = extensionMatch[1].toLowerCase();
            fileType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
          }
        }

        const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

        const presignedResponse = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ fileName, fileType, folder: 'uploads' }),
        });

        if (!presignedResponse.ok) throw new Error('Failed to get presigned URL');
        const { url: presignedUrl, key }: PresignedUrlResponse = await presignedResponse.json();
        
        // Resolve the raw file content safely
        const imageResponse = await fetch(imageUri);
        const blob = await imageResponse.blob();

        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileType },
          body: blob,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload image to S3');
        imageKeys.push(key);
      }
      
      setUploadedImageKeys(imageKeys);
      showAlert('Success', `${imageKeys.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      showAlert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };
  const handleCreateProduct = () => {
    if (!category.trim() || !name.trim() || !description.trim() || !price) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }
    if (!isService && !quantity) {
      showAlert('Error', 'Please enter the quantity');
      return;
    }
    if (uploadedImageKeys.length === 0) {
      showAlert('Error', 'Please upload your picked images first');
      return;
    }

    const finalPrice = needsTimeUnit ? `${price}/${serviceUnit}` : `${price}/${unit}`;
    const productData: ProductData = {
      name,
      description,
      price: finalPrice,
      quantity: isService ? 1 : parseInt(quantity),
      category,
      images: uploadedImageKeys,
    };

    createProductMutation.mutate(productData);
  };
  const SelectionModal = ({ visible, data, title, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <FontAwesome name="times" size={20} color="#2D2416" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem} 
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isService ? 'Add New Service' : 'Add New Product'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          style={styles.inputWrapper} 
          onPress={() => setShowCategoryModal(true)}
        >
          <View pointerEvents="none">
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              placeholder="Select Category *"
              placeholderTextColor="#A89378"
              value={category}
              editable={false}
            />
          </View>
          <FontAwesome name="chevron-down" size={14} color="#A89378" style={styles.inputIcon} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={isService ? "Service Name *" : "Product Name *"}
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
        />

        {/* PRICE FIELD - Shows Unit dropdown for Service and Rent */}
        <View style={styles.parallelContainer}>
          <View style={{ flex: 2 }}>
            <TextInput
              style={styles.input}
              placeholder="Price *"
              placeholderTextColor="#A89378"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
          {needsTimeUnit && (
            <View style={{ flex: 1.5, marginLeft: 10 }}>
              <TouchableOpacity 
                style={styles.unitSelector} 
                onPress={() => setShowServiceUnitModal(true)}
              >
                <Text style={styles.unitText}>/ {serviceUnit}</Text>
                <FontAwesome name="caret-down" size={16} color="#DAA520" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* STOCK/QUANTITY FIELD */}
        {!isService && (
          <View style={styles.section}>
            <View style={styles.parallelContainer}>
              <View style={{ flex: 2 }}>
                <TextInput
                  style={styles.input}
                  placeholder={isRent ? "Stock (Unit) *" : "Stock *"}
                  placeholderTextColor="#A89378"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>

              {!isRent && (
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <TouchableOpacity 
                    style={styles.unitSelector} 
                    onPress={() => setShowUnitModal(true)}
                  >
                    <Text style={styles.unitText}>{unit}</Text>
                    <FontAwesome name="caret-down" size={16} color="#DAA520" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images</Text>
          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="image" size={24} color="#DAA520" />
            <Text style={styles.pickButtonText}>Pick Images</Text>
          </TouchableOpacity>

          <View style={styles.imagesContainer}>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {selectedImages.length > 0 && uploadedImageKeys.length === 0 && (
            <TouchableOpacity style={styles.uploadButton} onPress={uploadImages} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>Upload</Text>}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, (createProductMutation.isPending || uploadedImageKeys.length === 0) && styles.buttonDisabled]}
          onPress={handleCreateProduct}
          disabled={createProductMutation.isPending || uploadedImageKeys.length === 0}
        >
          <Text style={styles.createButtonText}>Create {isService ? 'Service' : 'Product'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODALS */}
      <SelectionModal 
        visible={showCategoryModal}
        data={PRODUCT_CATEGORIES}
        title="Select Category"
        onSelect={handleSelectCategory}
        onClose={() => setShowCategoryModal(false)}
      />

      <SelectionModal 
        visible={showUnitModal}
        data={UNITS}
        title="Select Unit"
        onSelect={(item: string) => {
          setUnit(item);
          setShowUnitModal(false);
        }}
        onClose={() => setShowUnitModal(false)}
      />

      {/* DYNAMIC UNIT MODAL FOR SERVICE/RENT */}
      <SelectionModal 
        visible={showServiceUnitModal}
        data={isService ? SERVICE_UNITS : RENT_UNITS}
        title={isService ? "Select Service Unit" : "Select Rental Unit"}
        onSelect={(item: string) => {
          setServiceUnit(item);
          setShowServiceUnitModal(false);
        }}
        onClose={() => setShowServiceUnitModal(false)}
      />
    </View>
  );
}