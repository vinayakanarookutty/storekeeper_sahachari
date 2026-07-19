import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { getToken } from './services/auth';
import { styles } from './styles/add-edit-common.style';
import { useLanguage } from './contexts/LanguageContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

// Removed 'Service' and 'Rent'
const PRODUCT_CATEGORIES = ['Food', 'Vegetables and Fruits', 'Groceries', 'Home Made', 'Fish & Meat'];
const UNITS = ['kg', 'grams', 'liters', 'ml', 'pcs', 'packet', 'box'];

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(
      title, 
      message, 
      onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined
    );
  }
};

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
  const { t } = useLanguage();
  
  const product = params.product ? JSON.parse(params.product as string) : null;

  const parsePriceData = () => {
    if (!product?.price) return { val: '', unit: 'kg' };
    const parts = product.price.toString().split('/');
    return {
      val: parts[0],
      unit: parts[1] || 'kg'
    };
  };

  const initialPriceInfo = parsePriceData();

  // STATES
  const [category, setCategory] = useState(product?.category || '');
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(initialPriceInfo.val);
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || '');
  const [unit, setUnit] = useState(initialPriceInfo.unit);

  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const translateKey = (target: string, group: 'categories' | 'units' = 'categories'): string => {
    if (!target) return '';
    const lookupKey = target.toLowerCase().trim();
    const contextMap = t as any;

    if (group === 'units' && contextMap.units && typeof contextMap.units === 'object') {
      if (lookupKey in contextMap.units) return contextMap.units[lookupKey];
    }
    if (lookupKey in contextMap) {
      return contextMap[lookupKey];
    }
    return target; 
  };

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductData }) => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update product');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      showAlert(t.successTitle || 'Success', 'Updated successfully!', () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['productDetail', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['homeDashboardItems'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Error', error.message || 'Failed to update item');
    },
  });

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const uploadImages = async () => {
    setIsUploading(true);
    const newKeys: string[] = [];
    try {
      const token = await getToken();
      for (const uri of selectedImages) {
        let fileExtension = 'jpg';
        let fileType = 'image/jpeg';

        if (Platform.OS === 'web') {
          if (uri.includes('image/png') || uri.endsWith('.png')) {
            fileExtension = 'png';
            fileType = 'image/png';
          }
        } else {
          const uriParts = uri.split('.');
          const ext = uriParts[uriParts.length - 1].toLowerCase();
          if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            fileExtension = ext;
            fileType = ext === 'png' ? 'image/png' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          }
        }

        const fileName = `edit_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
        const presignedRes = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName, fileType, folder: 'uploads' }),
        });
        
        const { url, key } = await presignedRes.json();
        const blob = await (await fetch(uri)).blob();
        
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': fileType }, body: blob });
        newKeys.push(key);
      }
      setUploadedImageKeys(prev => [...prev, ...newKeys]);
      setSelectedImages([]);
      showAlert(t.successTitle || 'Success', 'New images uploaded!');
    } catch (e) {
      showAlert(t.failedTitle || 'Error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProduct = () => {
    if (!category.trim() || !name.trim() || !description.trim() || !price || !quantity) {
      showAlert(t.failedTitle || 'Error', 'Please fill in all required fields');
      return;
    }
    
    const finalImages = [...existingImages, ...uploadedImageKeys];
    if (finalImages.length === 0) {
      showAlert(t.failedTitle || 'Error', 'Please keep or upload at least one image');
      return;
    }

    const finalPrice = `${price}/${unit}`;

    const productData: ProductData = {
      name,
      description,
      price: finalPrice,
      quantity: parseInt(quantity, 10),
      category,
      images: finalImages,
    };

    const currentId = product?._id; 

    if (!currentId) {
      return showAlert(t.failedTitle || 'Error', 'Could not locate an active Product ID to update');
    }

    updateProductMutation.mutate({
      id: currentId,
      data: productData,
    });
  };

  const SelectionModal = ({ visible, data, title, onSelect, onClose, isUnitMode = false }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}><FontAwesome name="times" size={20} color="#2D2416" /></TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                  <Text style={styles.modalItemText}>
                    {translateKey(item, isUnitMode ? 'units' : 'categories')}
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
          {t.editProduct || 'Edit Product'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCategoryModal(true)}>
          <TextInput 
            style={[styles.input, { marginBottom: 0 }]} 
            value={translateKey(category, 'categories')} 
            editable={false} 
            placeholder={t.selectCategory ? `${t.selectCategory} *` : "Category *"} 
            placeholderTextColor="#A89378" 
          />
          <FontAwesome name="chevron-down" size={14} color="#A89378" style={styles.inputIcon} />
        </TouchableOpacity>

        <TextInput 
          style={styles.input} 
          placeholder={`${t.productName || 'Product Name'} *`} 
          value={name} 
          onChangeText={setName} 
          placeholderTextColor="#A89378" 
        />
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder={t.description ? `${t.description} *` : "Description *"} 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          placeholderTextColor="#A89378" 
        />

        <View style={styles.parallelContainer}>
          <View style={{ flex: 2 }}>
            <TextInput 
              style={styles.input} 
              placeholder={t.price ? `${t.price} *` : "Price *"} 
              value={price} 
              onChangeText={setPrice} 
              keyboardType="numeric" 
              placeholderTextColor="#A89378" 
            />
          </View>
        </View>

        <View style={styles.parallelContainer}>
          <View style={{ flex: 1.5 }}>
            <TextInput 
              style={styles.input} 
              placeholder={`${t.stockQty || 'Stock'} *`} 
              value={quantity} 
              onChangeText={setQuantity} 
              keyboardType="numeric" 
              placeholderTextColor="#A89378" 
            />
          </View>
          <View style={{ flex: 1.3, marginLeft: 10, minWidth: 115 }}>
            <TouchableOpacity style={styles.unitSelector} onPress={() => setShowUnitModal(true)}>
              <Text 
                style={[styles.unitText, { flex: 1, marginRight: 4 }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {translateKey(unit, 'units')}
              </Text>
              <FontAwesome name="caret-down" size={16} color="#DAA520" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.manageImages || 'Manage Images'}</Text>
          
          <View style={styles.imagesContainer}>
            {existingImages.map((img, index) => (
              <View key={`ex-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri: img.startsWith('http') ? img : `${S3_BASE_URL}/${img}` }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {selectedImages.map((uri, index) => (
              <View key={`new-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="plus" size={20} color="#DAA520" />
            <Text style={styles.pickButtonText}>{t.addNewImages || 'Add New Images'}</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <TouchableOpacity style={styles.uploadButton} onPress={uploadImages} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>{t.uploadSelection || 'Upload Selection'}</Text>}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.createButton, updateProductMutation.isPending && styles.buttonDisabled]} 
          onPress={handleUpdateProduct}
          disabled={updateProductMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {t.saveLabel || 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SelectionModal 
        visible={showCategoryModal} 
        data={PRODUCT_CATEGORIES} 
        title={t.selectCategory || "Select Category"} 
        isUnitMode={false}
        onSelect={(item: string) => { 
          setCategory(item); 
          setShowCategoryModal(false); 
        }} 
        onClose={() => setShowCategoryModal(false)} 
      />

      <SelectionModal 
        visible={showUnitModal} 
        data={UNITS} 
        title={t.selectUnit || "Select Unit"} 
        isUnitMode={true}
        onSelect={(item: string) => { 
          setUnit(item); 
          setShowUnitModal(false); 
        }} 
        onClose={() => setShowUnitModal(false)} 
      />
    </View>
  );
}