// D:\storekeeper_sahachari\app\edit-service.tsx
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
import { servicesApi, ServiceData } from './services/serviceApi'; // adjust path to your API file

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const SERVICE_DISPLAY_UNITS = ['Hour', 'Day', 'Week', 'Month'];

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(title, message, onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined);
  }
};

export default function EditServiceScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse item parameter using the exact edit-product context design pattern
  const serviceItem = params.service ? JSON.parse(params.service as string) : null;

  const parseUnitData = () => {
    if (!serviceItem?.unit) return 'Hour';
    const rawUnit = serviceItem.unit.toLowerCase();
    return rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1);
  };

  // INITIAL FORM STATES INITIALIZATION
  const [name, setName] = useState(serviceItem?.name || '');
  const [description, setDescription] = useState(serviceItem?.description || '');
  const [price, setPrice] = useState(serviceItem?.price ? serviceItem.price.toString() : '');
  const [serviceUnit, setServiceUnit] = useState(parseUnitData());
  
  // IMAGE MANAGEMENT ARCHITECTURE
  const [existingImages, setExistingImages] = useState<string[]>(serviceItem?.images || []);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ServiceData }) => {
      return servicesApi.updateService(id, data);
    },
    onSuccess: (data, variables) => {
      showAlert('Success', 'Service updated successfully!', () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['services'] });
        queryClient.invalidateQueries({ queryKey: ['serviceDetail', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['homeDashboardItems'] });
        router.back();
      });
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to update service');
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

        const fileName = `edit_service_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateService = () => {
    if (!name.trim() || !description.trim() || !price) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    const finalImages = [...existingImages, ...uploadedImageKeys];
    if (finalImages.length === 0) {
      showAlert('Error', 'Please keep or upload at least one image');
      return;
    }

    if (selectedImages.length > 0) {
      showAlert('Error', 'Please upload your new selected images before saving changes');
      return;
    }

    const backendUnit = serviceUnit.toUpperCase() as 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
    const currentId = serviceItem?._id;

    if (!currentId) {
      return showAlert('Error', 'Could not locate an active Service ID to update');
    }

    const serviceData: ServiceData = {
      name,
      description,
      price: parseFloat(price),
      unit: backendUnit,
      images: finalImages,
    };

    updateServiceMutation.mutate({
      id: currentId,
      data: serviceData,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Service</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#2D2416" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput style={styles.input} placeholder="Service Name *" placeholderTextColor="#A89378" value={name} onChangeText={setName} />
        
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description *" placeholderTextColor="#A89378" value={description} onChangeText={setDescription} multiline />

        {/* PRICE & UNIT PICKER */}
        <View style={styles.parallelContainer}>
          <View style={{ flex: 2 }}>
            <TextInput style={styles.input} placeholder="Service Rate Price *" placeholderTextColor="#A89378" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1.5, marginLeft: 10 }}>
            <TouchableOpacity style={styles.unitSelector} onPress={() => setShowUnitModal(true)}>
              <Text style={styles.unitText}>/ {serviceUnit}</Text>
              <FontAwesome name="caret-down" size={16} color="#DAA520" />
            </TouchableOpacity>
          </View>
        </View>

        {/* IMAGE PREVIEW & MANAGEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Images</Text>
          
          <View style={styles.imagesContainer}>
            {/* S3 Remote Images */}
            {existingImages.map((img, index) => (
              <View key={`ex-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri: img.startsWith('http') ? img : `${S3_BASE_URL}/${img}` }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* Newly Selected Device Images */}
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
          style={[styles.createButton, updateServiceMutation.isPending && styles.buttonDisabled]}
          onPress={handleUpdateService}
          disabled={updateServiceMutation.isPending}
        >
          <Text style={styles.createButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SERVICE UNIT MODAL */}
      <Modal visible={showUnitModal} transparent animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowUnitModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Service Unit</Text>
                <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                  <FontAwesome name="times" size={20} color="#2D2416" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={SERVICE_DISPLAY_UNITS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setServiceUnit(item); setShowUnitModal(false); }}>
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