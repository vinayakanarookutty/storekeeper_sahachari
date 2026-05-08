import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Modal, // Added Modal
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

const PRODUCT_CATEGORIES = [
  'Food',
  'Vegetables and Fruits',
  'Groceries',
  'Home Made',
  'Service',
  'Fish & Meat'
];

const UNITS = ['kg', 'grams', 'liters', 'ml', 'pcs', 'packet', 'box'];

export default function AddProductScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // MODAL STATES
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const isService = category === 'Service';

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
    setShowCategoryModal(false);
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
        let cleanPath = imageUri.split(':http')[0].replace('blob:', '');
        const extensionMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
        const fileExtension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
        const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const fileType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

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
      Alert.alert('Success', `${imageKeys.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProduct = () => {
    if (!category.trim() || !name.trim() || !description.trim() || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
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

  // Selection Modal Component for reusability
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
        {/* CATEGORY FIELD */}
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

        <TextInput
          style={styles.input}
          placeholder="Price *"
          placeholderTextColor="#A89378"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {!isService && (
          <View style={styles.section}>
            <View style={styles.parallelContainer}>
              <View style={{ flex: 2 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Stock *"
                  placeholderTextColor="#A89378"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <TouchableOpacity 
                  style={styles.unitSelector} 
                  onPress={() => setShowUnitModal(true)}
                >
                  <Text style={styles.unitText}>{unit}</Text>
                  <FontAwesome name="caret-down" size={16} color="#DAA520" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.fieldHint}>
              Total Stock: {quantity || '0'} {unit}
            </Text>
          </View>
        )}

        {/* IMAGES SECTION */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E0D6C3' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2D2416' },
  closeButton: { padding: 8 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  inputIcon: { position: 'absolute', right: 16, top: 20 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0D6C3', color: '#2D2416' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2D2416', marginBottom: 12 },
  parallelContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  unitSelector: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 8, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E0D6C3', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    height: 58 
  },
  unitText: { fontSize: 16, color: '#2D2416', fontWeight: '600' },
  fieldHint: { fontSize: 12, color: '#856404', marginTop: -6, marginBottom: 8 },
  pickButton: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#DAA520', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', gap: 12 },
  pickButtonText: { color: '#DAA520', fontSize: 16, fontWeight: '600' },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 12 },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 8 },
  removeButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ff3b30', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  uploadButton: { backgroundColor: '#4A90E2', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  createButton: { backgroundColor: '#DAA520', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 40 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  
  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D2416' },
  modalItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalItemText: { fontSize: 16, color: '#2D2416' }
});