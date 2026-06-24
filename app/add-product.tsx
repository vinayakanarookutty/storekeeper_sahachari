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
import { useLanguage } from './contexts/LanguageContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  'Fish & Meat',
  
];

const UNITS = ['kg', 'grams', 'liters', 'ml', 'pcs', 'packet', 'box'];

export default function AddProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [serviceUnit, setServiceUnit] = useState('Hour');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // MODAL STATES
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showServiceUnitModal, setShowServiceUnitModal] = useState(false);


  // DYNAMIC LOOKUP HELPER FOR TRANSLATED LABELS
  const getLocalizedUnitLabel = (unitValue: string): string => {
    if (!t || !t.units) return unitValue;
    const localized = (t.units as Record<string, string>)[unitValue];
    return typeof localized === 'string' ? localized : unitValue;
  };

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
      showAlert(t.successTitle || 'Success', 'Created successfully!', () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Error', error.message || 'Failed to create item');
    },
  });

  const handleSelectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategoryModal(false);
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t.failedTitle || 'Permission needed', 'Please grant permission to access photos');
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
      showAlert(t.failedTitle || 'Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      showAlert(t.failedTitle || 'Error', 'Please select at least one image');
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
          if (imageUri.includes('image/png') || imageUri.endsWith('.png')) {
            fileExtension = 'png';
            fileType = 'image/png';
          }
        } else {
          // Native clean path strategy for file extension parsing
          const uriParts = imageUri.split('.');
          const ext = uriParts[uriParts.length - 1].toLowerCase();
          if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            fileExtension = ext;
            fileType = ext === 'png' ? 'image/png' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
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
      showAlert(t.successTitle || 'Success', `${imageKeys.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      showAlert(t.failedTitle || 'Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProduct = () => {
    if (!category.trim() || !name.trim() || !description.trim() || !price) {
      showAlert(t.failedTitle || 'Error', 'Please fill in all required fields');
      return;
    }
    
    if (uploadedImageKeys.length === 0) {
      showAlert(t.failedTitle || 'Error', 'Please upload your picked images first');
      return;
    }

    const finalPrice =  `${price}/${unit}`;
    const productData: ProductData = {
      name,
      description,
      price: finalPrice,
      quantity: parseInt(quantity),
      category,
      images: uploadedImageKeys,
    };

    createProductMutation.mutate(productData);
  };

  // LOCALIZED SELECTION MODAL
  const SelectionModal = ({ visible, data, title, onSelect, onClose, isUnitModal = false }: any) => (
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
                  <Text style={styles.modalItemText}>
                    {isUnitModal ? getLocalizedUnitLabel(item) : item}
                  </Text>
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
        <Text style={styles.headerTitle}>
          {    (t.addNewProduct || 'Add New Product')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* CATEGORY INPUT */}
        <TouchableOpacity 
          style={styles.inputWrapper} 
          onPress={() => setShowCategoryModal(true)}
        >
          <View pointerEvents="none">
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              placeholder={t.selectCategory ? `${t.selectCategory} *` : "Select Category *"}
              placeholderTextColor="#A89378"
              value={category}
              editable={false}
            />
          </View>
          <FontAwesome name="chevron-down" size={14} color="#A89378" style={styles.inputIcon} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={ (t.productName || "Product Name *")}
          placeholderTextColor="#A89378"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t.description ? `${t.description} *` : "Description *"}
          placeholderTextColor="#A89378"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* PRICE FIELD */}
        <View style={styles.parallelContainer}>
          <View style={{ flex: 2 }}>
            <TextInput
              style={styles.input}
              placeholder={t.price ? `${t.price} *` : "Price *"}
              placeholderTextColor="#A89378"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
        </View>


        {/* IMAGES SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.images || 'Images'}</Text>
          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="image" size={24} color="#DAA520" />
            <Text style={styles.pickButtonText}>{t.pickImages || 'Pick Images'}</Text>
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
              {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>{t.upload || 'Upload'}</Text>}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, (createProductMutation.isPending || uploadedImageKeys.length === 0) && styles.buttonDisabled]}
          onPress={handleCreateProduct}
          disabled={createProductMutation.isPending || uploadedImageKeys.length === 0}
        >
        </TouchableOpacity>
      </ScrollView>

      {/* MODALS */}
      <SelectionModal 
        visible={showCategoryModal}
        data={PRODUCT_CATEGORIES}
        title={t.selectCategory || "Select Category"}
        onSelect={handleSelectCategory}
        close={(() => setShowCategoryModal(false))}
      />

      <SelectionModal 
        visible={showUnitModal}
        data={UNITS}
        title={t.selectUnit || "Select Unit"}
        isUnitModal={true}
        onSelect={(item: string) => {
          setUnit(item);
          setShowUnitModal(false);
        }}
        onClose={() => setShowUnitModal(false)}
      />

      
    </View>
  );
}