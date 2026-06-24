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
import { rentalsApi, RentalData } from './services/rentalsApi';

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

// Display options for the user interface
const RENT_DISPLAY_UNITS = ['Hour', 'Day', 'Week', 'Month'];

export default function AddRentScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [rentUnit, setRentUnit] = useState('Day'); 
  const [quantity, setQuantity] = useState(''); 
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Integrated with our new rentalsApi service module
  const createRentMutation = useMutation({
    mutationFn: (rentalData: RentalData) => rentalsApi.createRental(rentalData),
    onSuccess: () => {
      showAlert('Success', 'Rental listing created successfully!', () => {
        // Invalidates the store items cache list to force update screen feeds
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['rentals'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to create rental listing');
    },
  });

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
        setSelectedImages(prev => [...prev, ...result.assets.map(asset => asset.uri)]);
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

        const fileName = `rent_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

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
      showAlert('Success', `${imageKeys.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      showAlert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateRent = () => {
    if (!name.trim() || !description.trim() || !price || !quantity) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }
    if (uploadedImageKeys.length === 0) {
      showAlert('Error', 'Please upload your picked images first');
      return;
    }

    // Convert UI display units (e.g. 'Day') to backend uppercase enums ('DAY')
    const backendUnit = rentUnit.toUpperCase() as 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

    const rentData: RentalData = {
      name,
      description,
      rentalPrice: parseFloat(price),
      quantity: parseInt(quantity),
      unit: backendUnit,
      images: uploadedImageKeys,
    };

    createRentMutation.mutate(rentData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Rental Item</Text>
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

        {/* STOCK QUANTITY FOR RENT */}
        <View style={styles.section}>
          <TextInput style={styles.input} placeholder="Available Items Stock Quantity *" placeholderTextColor="#A89378" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        </View>

        {/* IMAGES CONTAINER */}
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
          style={[styles.createButton, (createRentMutation.isPending || uploadedImageKeys.length === 0) && styles.buttonDisabled]}
          onPress={handleCreateRent}
          disabled={createRentMutation.isPending || uploadedImageKeys.length === 0}
        >
          <Text style={styles.createButtonText}>Create Rental Listing</Text>
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