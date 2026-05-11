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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getToken } from './services/auth';

// Ensure these URLs match your environment configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com'; 

const PRODUCT_CATEGORIES = ['Food', 'Vegetables and Fruits', 'Groceries', 'Home Made', 'Service', 'Fish & Meat'];
const UNITS = ['kg', 'grams', 'liters', 'ml', 'pcs', 'packet', 'box'];

interface PresignedUrlResponse {
  url: string;
  key: string;
}

interface ProductData {
  name: string;
  description: string;
  price: number; 
  quantity: number;
  category: string;
  images: string[];
}

export default function EditProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse initial product data
  const productData = params.product ? JSON.parse(params.product as string) : null;
  
  const [name, setName] = useState(productData?.name || '');
  const [description, setDescription] = useState(productData?.description || '');
  const [price, setPrice] = useState(productData?.price?.toString() || '');
  const [quantity, setQuantity] = useState(productData?.quantity?.toString() || '');
  const [category, setCategory] = useState(productData?.category || '');
  const [unit, setUnit] = useState('kg');
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(productData?.images || []);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const isService = category === 'Service';

  const updateProductMutation = useMutation({
    mutationFn: async (updatedData: ProductData) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/products/${productData._id || params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update product');
      }
      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Success', 'Updated successfully!', [
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
      Alert.alert('Error', error.message);
    },
  });

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Grant access to photos');

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
    const imageKeys: string[] = [];
    try {
      const token = await getToken();
      for (const uri of selectedImages) {
        const fileName = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
        const presignedRes = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName, fileType: 'image/jpeg', folder: 'uploads' }),
        });
        const { url, key } = await presignedRes.json();
        const imgBlob = await (await fetch(uri)).blob();
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: imgBlob });
        imageKeys.push(key);
      }
      setUploadedImageKeys(imageKeys);
      Alert.alert('Success', 'New images uploaded!');
    } catch (e) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProduct = () => {
    if (!name || !price || !category) return Alert.alert('Error', 'Required fields missing');
    
    // Process existing images to ensure we only send the keys back to the DB
    const processedExistingKeys = existingImages
      .map(img => img.replace(`${S3_BASE_URL}/`, '')) // Remove S3 prefix if present
      .filter(Boolean) as string[];

    const finalImagesKeys = [...processedExistingKeys, ...uploadedImageKeys];

    if (finalImagesKeys.length === 0) return Alert.alert('Error', 'Product requires at least one image');

    updateProductMutation.mutate({
      name,
      description,
      price: parseFloat(price), // Fixed: Convert string to number
      quantity: isService ? 100 : parseInt(quantity),
      category,
      images: finalImagesKeys, 
    });
  };

  const SelectionModal = ({ visible, data, title, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text></View>
            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
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
        <Text style={styles.headerTitle}>Edit Details</Text>
        <TouchableOpacity onPress={() => router.back()}><FontAwesome name="times" size={24} color="#2D2416" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* CATEGORY FIELD */}
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCategoryModal(true)}>
          <TextInput style={[styles.input, { marginBottom: 0 }]} value={category} editable={false} placeholder="Select Category" />
          <FontAwesome name="chevron-down" size={14} color="#A89378" style={styles.inputIcon} />
        </TouchableOpacity>

        {/* NAME FIELD */}
        <Text style={styles.label}>Product/Service Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter Name" />

        {/* DESCRIPTION FIELD */}
        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          placeholder="Enter Description"
        />

        {/* PRICE FIELD */}
        <Text style={styles.label}>Price (Numeric)</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" />

        {!isService && (
          <>
            <Text style={styles.label}>Stock Quantity</Text>
            <View style={styles.parallelContainer}>
              <TextInput 
                style={[styles.input, { flex: 2 }]} 
                value={quantity} 
                onChangeText={setQuantity} 
                keyboardType="numeric" 
                placeholder="0"
              />
              <TouchableOpacity style={styles.unitSelector} onPress={() => setShowUnitModal(true)}>
                <Text style={styles.unitText}>{unit}</Text>
                <FontAwesome name="caret-down" size={16} color="#DAA520" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Images</Text>
          
          {/* Preview of Existing/Current Images */}
          {existingImages.length > 0 && (
            <View style={styles.imagesContainer}>
              {existingImages.map((imageKey, i) => {
                const imageUri = imageKey.startsWith('https') ? imageKey : `${S3_BASE_URL}/${imageKey}`;
                return (
                  <View key={i} style={styles.imageWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity 
                      style={styles.removeButton} 
                      onPress={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Pick New Images */}
          <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
            <FontAwesome name="plus" size={20} color="#DAA520" />
            <Text style={styles.pickButtonText}>Select New Images</Text>
          </TouchableOpacity>

          {/* New Image Previews (Before Upload) */}
          {selectedImages.length > 0 && (
            <View style={[styles.imagesContainer, { marginTop: 15 }]}>
              {selectedImages.map((uri, i) => (
                <View key={i} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {selectedImages.length > 0 && uploadedImageKeys.length === 0 && (
            <TouchableOpacity style={styles.uploadButton} onPress={uploadImages} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>Upload New Selection</Text>}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
            style={[styles.createButton, (updateProductMutation.isPending) && styles.buttonDisabled]} 
            onPress={handleUpdateProduct}
            disabled={updateProductMutation.isPending}
        >
          <Text style={styles.createButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      <SelectionModal visible={showCategoryModal} data={PRODUCT_CATEGORIES} title="Category" onSelect={(v: string) => { setCategory(v); setShowCategoryModal(false); }} onClose={() => setShowCategoryModal(false)} />
      <SelectionModal visible={showUnitModal} data={UNITS} title="Unit" onSelect={(v: string) => { setUnit(v); setShowUnitModal(false); }} onClose={() => setShowUnitModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E0D6C3' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2D2416' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#856404', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  inputIcon: { position: 'absolute', right: 16, top: 20 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0D6C3', color: '#2D2416' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  parallelContainer: { flexDirection: 'row', gap: 10 },
  unitSelector: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#E0D6C3', flexDirection: 'row', alignItems: 'center', height: 58, flex: 1, justifyContent: 'space-between' },
  unitText: { fontSize: 16, color: '#2D2416', fontWeight: 'bold' },
  section: { marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D2416', marginBottom: 15 },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5 },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: 85, height: 85, borderRadius: 8, backgroundColor: '#E0D6C3' },
  removeButton: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  removeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pickButton: { backgroundColor: '#FFF', borderRadius: 8, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#DAA520', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10 },
  pickButtonText: { color: '#DAA520', fontWeight: '600' },
  uploadButton: { backgroundColor: '#4A90E2', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 15 },
  uploadButtonText: { color: '#fff', fontWeight: 'bold' },
  createButton: { backgroundColor: '#DAA520', borderRadius: 8, padding: 18, alignItems: 'center', marginTop: 20, marginBottom: 50 },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalItemText: { fontSize: 16 }
});