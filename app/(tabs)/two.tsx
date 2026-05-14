import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';
import { styles } from './tab_style/two.style';
styles

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const COLORS = {
  bg: '#FFF9E6',
  card: '#FFFFFF',
  primary: '#DAA520',
  textDark: '#2D2416',
  textLight: '#856404',
  danger: '#FF3B30',
  border: '#E0D6C3',
};

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role?: string;
  address?: string;
  address2?: string;
  mobileNumber?: string;
  serviceablePincodes?: string[];
  image?: string;
}

interface EditModalProps {
  visible: boolean;
  field: string | null;
  value: string;
  onClose: () => void;
  onSave: (field: string, value: string) => void;
  isLoading: boolean;
}

function EditModal({ visible, field, value, onClose, onSave, isLoading }: EditModalProps) {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    if (visible) setEditValue(value);
  }, [visible, value]);

  const getFieldLabel = () => {
    switch (field) {
      case 'address': return 'Primary Address';
      case 'address2': return 'Secondary Address';
      case 'mobileNumber': return 'Mobile Number';
      case 'serviceablePincodes': return 'Serviceable Pincodes';
      default: return '';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit {getFieldLabel()}</Text>
            <TouchableOpacity onPress={onClose}><FontAwesome name="times" size={20} color={COLORS.textDark} /></TouchableOpacity>
          </View>

          <TextInput
            style={[styles.modalInput, (field === 'address' || field === 'address2') && styles.textArea]}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={`Enter ${getFieldLabel().toLowerCase()}`}
            multiline={field === 'address' || field === 'address2'}
            keyboardType={field === 'mobileNumber' ? 'phone-pad' : 'default'}
            editable={!isLoading}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isLoading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, isLoading && { opacity: 0.7 }]} 
              onPress={() => field && onSave(field, editValue)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TabTwoScreen() {
  const { token, clearAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editInitialValue, setEditInitialValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: userData, refetch } = useQuery<UserProfile>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const authToken = await getToken();
      const res = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: !!token,
  });

  // 1. REFRESH LOGIC
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateProfileMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const authToken = await getToken();
      const body: any = {};
      
      if (field === 'serviceablePincodes') {
        body[field] = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
      } else {
        body[field] = value;
      }

      const response = await fetch(`${API_BASE_URL}/users/update-me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const authToken = await getToken();
      
      let cleanPath = imageUri.split(':http')[0].replace('blob:', '');
      const extensionMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
      const fileExtension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
      const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const fileType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

      const presignedResponse = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ fileName, fileType, folder: 'avatars' }),
      });
      if (!presignedResponse.ok) throw new Error('Failed to get upload URL');
      const { url: presignedUrl, key } = await presignedResponse.json();

      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error('S3 Upload failed');

      const updateResponse = await fetch(`${API_BASE_URL}/users/update-me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ image: key }),
      });
      if (!updateResponse.ok) throw new Error('Failed to link profile picture');
      
      return updateResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      Alert.alert('Success', 'Profile picture updated!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Upload failed');
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadAvatarMutation.mutate(result.assets[0].uri);
    }
  };

  const handleEditPress = (field: keyof UserProfile) => {
    let val = '';
    if (userData) {
      const rawVal = userData[field];
      val = Array.isArray(rawVal) ? rawVal.join(', ') : (rawVal as string) || '';
    }
    setEditingField(field as string);
    setEditInitialValue(val);
    setEditModalVisible(true);
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      // 2. REFRESH CONTROL COMPONENT
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={COLORS.primary} 
          colors={[COLORS.primary]}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          {uploadAvatarMutation.isPending ? (
            <View style={styles.avatarPlaceholder}><ActivityIndicator color={COLORS.primary} /></View>
          ) : userData?.image ? (
            <Image source={{ uri: `${S3_BASE_URL}/${userData.image}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><FontAwesome name="user" size={50} color={COLORS.primary} /></View>
          )}
          <TouchableOpacity style={styles.camBtn} onPress={handlePickImage} disabled={uploadAvatarMutation.isPending}>
            <FontAwesome name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{userData?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {[
          { label: 'Mobile Number', field: 'mobileNumber', icon: 'phone' },
          { label: 'Primary Address', field: 'address', icon: 'map-marker' },
          { label: 'Secondary Address', field: 'address2', icon: 'building' },
          { label: 'Service Pincodes', field: 'serviceablePincodes', icon: 'envelope-o' }
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.infoCard} onPress={() => handleEditPress(item.field as any)}>
            <View style={styles.infoIconBg}><FontAwesome name={item.icon as any} size={16} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.field === 'serviceablePincodes' 
                  ? (userData?.serviceablePincodes?.join(', ') || 'Add pincodes')
                  : (userData?.[item.field as keyof UserProfile] as string || `Add ${item.label.toLowerCase()}`)}
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={COLORS.border} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await clearAuthToken(); router.replace('/login'); }}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <EditModal
        visible={editModalVisible}
        field={editingField}
        value={editInitialValue}
        onClose={() => setEditModalVisible(false)}
        isLoading={updateProfileMutation.isPending}
        onSave={(field, value) => updateProfileMutation.mutate({ field, value })}
      />
    </ScrollView>
  );
}
