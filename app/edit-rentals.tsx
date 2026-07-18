// D:\storekeeper_sahachari\app\edit-rental.tsx
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
import { styles } from './styles/add-edit-common.style';
import { getToken } from './services/auth';
import { rentalsApi, RentalData } from './services/rentalsApi';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const RENT_DISPLAY_UNITS = ['Hour', 'Day', 'Week', 'Month'];

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(title, message, onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined);
  }
};

export default function EditRentalScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Exact same architecture as your edit-product model 
  const rental = params.rental ? JSON.parse(params.rental as string) : null;

  const parseUnitData = () => {
    if (!rental?.unit) return 'Day';
    const rawUnit = rental.unit.toLowerCase();
    return rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1);
  };

  // INITIAL FORM STATES POPULATION
  const [name, setName] = useState(rental?.name || '');
  const [description, setDescription] = useState(rental?.description || '');
  const [price, setPrice] = useState(rental?.rentalPrice ? rental.rentalPrice.toString() : '');
  const [rentUnit, setRentUnit] = useState(parseUnitData()); 
  const [quantity, setQuantity] = useState(rental?.quantity ? rental.quantity.toString() : ''); 
  
  // IMAGE ARCHITECTURE MATCHING EDIT-PRODUCT
  const [existingImages, setExistingImages] = useState<string[]>(rental?.images || []);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const updateRentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RentalData }) => {
      return rentalsApi.updateRental(id, data);
    },
    onSuccess: () => {
      showAlert('Success', 'Rental listing updated successfully!', () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['rentals'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to update rental listing');
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

        const fileName = `edit_rent_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
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
      showAlert('Success', 'New images uploaded successfully!');
    } catch (e) {
      showAlert('Error', 'Image upload failed');
    } fileType: {
      setIsUploading(false);
    }
  };

  const handleUpdateRent = () => {
    if (!name.trim() || !description.trim() || !price || !quantity) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    const finalImages = [...existingImages, ...uploadedImageKeys];
    if (finalImages.length === 0) {
      showAlert('Error', 'Please retain or upload at least one image');
      return;
    }

    if (selectedImages.length > 0) {
      showAlert('Error', 'Please upload your new selected images before saving changes');
      return;
    }

    const backendUnit = rentUnit.toUpperCase() as 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
    const currentId = rental?._id;

    if (!currentId) {
      return showAlert('Error', 'Could not locate an active Listing ID to update');
    }

    const rentalData: RentalData = {
      name,
      description,
      rentalPrice: parseFloat(price),
      quantity: parseInt(quantity, 10),
      unit: backendUnit,
      images: finalImages,
    };

    updateRentMutation.mutate({
      id: currentId,
      data: rentalData,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Rental Item</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput style={styles.input} placeholder="Rental Item Name *" placeholderTextColor="#A89378" value={name} onChangeText={setName} />
        
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description *" placeholderTextColor="#A89378" value={description} onChangeText={setDescription} multiline />

        {/* PRICE CONFIGURATION */}
        <View style={styles.parallelContainer}>
          <View style={{ flex: 2 }}>
            <TextInput style={styles.input} placeholder="Rental Price *" placeholderTextColor="#A89378" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1.5, marginLeft: 10 }}>
            <TouchableOpacity style={styles.unitSelector} onPress={() => setShowUnitModal(true)}>
              <Text style={styles.unitText}>/ {rentUnit}</Text>
              <FontAwesome name="caret-down" size={16} color="#DAA520" />
            </TouchableOpacity>
          </View>
        </View>

        {/* QUANTITY */}
        <View style={styles.section}>
          <TextInput style={styles.input} placeholder="Available Items Stock Quantity *" placeholderTextColor="#A89378" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        </View>

        {/* IMAGE PREVIEW & MANAGEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Images</Text>
          
          <View style={styles.imagesContainer}>
            {/* Render Remote S3 Cloud Images */}
            {existingImages.map((img, index) => (
              <View key={`ex-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri: img.startsWith('http') ? img : `${S3_BASE_URL}/${img}` }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* Render New Locally Picked Device Images */}
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
            <Text style={styles.pickButtonText}>Add New Images</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <TouchableOpacity style={styles.uploadButton} onPress={uploadImages} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>Upload Selection</Text>}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, updateRentMutation.isPending && styles.buttonDisabled]}
          onPress={handleUpdateRent}
          disabled={updateRentMutation.isPending}
        >
          <Text style={styles.createButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* RENTAL UNIT MODAL */}
      <Modal visible={showUnitModal} transparent animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowUnitModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Rental Unit</Text>
                <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                  <FontAwesome name="times" size={20} color="#2D2416" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={RENT_DISPLAY_UNITS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setRentUnit(item); setShowUnitModal(false); }}>
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}