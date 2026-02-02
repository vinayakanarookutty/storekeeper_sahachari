import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

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
  field: 'address' | 'address2' | 'mobileNumber' | 'serviceablePincodes' | null;
  value: string;
  onClose: () => void;
  onSave: (field: string, value: string) => void;
  isLoading: boolean;
}

function EditModal({ visible, field, value, onClose, onSave, isLoading }: EditModalProps) {
  const [editValue, setEditValue] = useState(value);

  const getFieldLabel = () => {
    switch (field) {
      case 'address': return 'Primary Address';
      case 'address2': return 'Secondary Address';
      case 'mobileNumber': return 'Mobile Number';
      case 'serviceablePincodes': return 'Serviceable Pincodes';
      default: return '';
    }
  };

  const handleSave = () => {
    if (field) {
      onSave(field, editValue);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit {getFieldLabel()}</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.modalInput,
              field === 'address' || field === 'address2' ? styles.textArea : null
            ]}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={`Enter ${getFieldLabel().toLowerCase()}`}
            multiline={field === 'address' || field === 'address2'}
            numberOfLines={field === 'address' || field === 'address2' ? 3 : 1}
            keyboardType={field === 'mobileNumber' ? 'phone-pad' : 'default'}
            editable={!isLoading}
          />

          {field === 'serviceablePincodes' && (
            <Text style={styles.helperText}>
              Enter comma-separated pincodes (e.g., 400001, 400050)
            </Text>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
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
  const [editingField, setEditingField] = useState<'address' | 'address2' | 'mobileNumber' | 'serviceablePincodes' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch user data
  const { data: userData, isLoading } = useQuery<UserProfile, Error>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    enabled: !!token,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string | string[] }) => {
      const authToken = await getToken();
      const body: any = {};
      
      if (field === 'serviceablePincodes') {
        body[field] = typeof value === 'string' 
          ? value.split(',').map(p => p.trim()).filter(p => p.length > 0)
          : value;
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

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
  mutationFn: async (imageUri: string) => {
    const authToken = await getToken();

    // 1. CLEAN THE URI (avoid blob:http / localhost junk in S3 key)
    let cleanPath = imageUri.split(':http')[0];
    cleanPath = cleanPath.replace('blob:', '');

    // 2. EXTRACT EXTENSION
    const extensionMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
    const fileExtension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';

    // 3. GENERATE CLEAN FILENAME
    const randomId = Math.random().toString(36).substring(7);
    const fileName = `avatar_${Date.now()}_${randomId}.${fileExtension}`;

    // 4. SET VALID MIME TYPE
    const fileType =
      fileExtension === 'png'
        ? 'image/png'
        : fileExtension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    console.log(`Uploading avatar: ${fileName} as ${fileType}`);

    // 5. GET PRESIGNED URL
    const presignedResponse = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fileName,
        fileType,
        folder: 'avatars',
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Failed to get presigned URL');
    }

    const { url: presignedUrl, key } = await presignedResponse.json();

    // 6. CONVERT IMAGE URI → BLOB
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();

    // 7. UPLOAD TO S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload avatar to S3');
    }

    // 8. UPDATE USER PROFILE WITH KEY
    const updateResponse = await fetch(`${API_BASE_URL}/users/update-me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ image: key }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update profile with avatar');
    }

    return updateResponse.json();
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    Alert.alert('Success', 'Profile picture updated!');
  },

  onError: (error: any) => {
    console.error('Avatar upload error:', error);
    Alert.alert('Error', error.message || 'Failed to upload avatar');
  },
});


  const handleEditField = (field: 'address' | 'address2' | 'mobileNumber' | 'serviceablePincodes') => {
    let value = '';
    if (userData) {
      if (field === 'serviceablePincodes' && userData.serviceablePincodes) {
        value = userData.serviceablePincodes.join(', ');
      } else {
        value = (userData[field] as string) || '';
      }
    }
    setEditingField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSaveField = (field: string, value: string) => {
    updateProfileMutation.mutate({ field, value });
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatarMutation.mutate(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuthToken();
            router.replace('/signup');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Avatar Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleChangeAvatar}
            disabled={uploadAvatarMutation.isPending}
          >
            {uploadAvatarMutation.isPending ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color="#FDB515" />
              </View>
            ) : userData?.image ? (
              <Image 
                source={{ uri: `${S3_BASE_URL}/${userData.image}` }}
                style={styles.avatar}
              />
            ) : (
              <FontAwesome name="user-circle" size={100} color="#FDB515" />
            )}
            <View style={styles.cameraIcon}>
              <FontAwesome name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          {userData?.name && (
            <Text style={styles.subtitle}>{userData.name}</Text>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FDB515" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : userData ? (
          <>
            {/* Basic Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.infoRow}>
                <FontAwesome name="user" size={20} color="#666" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.value}>{userData.name}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <FontAwesome name="envelope" size={20} color="#666" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{userData.email}</Text>
                </View>
              </View>

              {userData.role && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.infoRow}>
                    <FontAwesome name="id-badge" size={20} color="#666" style={styles.icon} />
                    <View style={styles.infoContent}>
                      <Text style={styles.label}>Role</Text>
                      <Text style={styles.value}>{userData.role}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Editable Fields Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Details</Text>
              
              {/* Primary Address */}
              <TouchableOpacity 
                style={styles.editableRow}
                onPress={() => handleEditField('address')}
              >
                <View style={styles.infoRow}>
                  <FontAwesome name="map-marker" size={20} color="#666" style={styles.icon} />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Primary Address</Text>
                    <Text style={styles.value}>
                      {userData.address || 'Not set'}
                    </Text>
                  </View>
                  <FontAwesome name="pencil" size={16} color="#FDB515" />
                </View>
              </TouchableOpacity>

              <View style={styles.separator} />

              {/* Secondary Address */}
              <TouchableOpacity 
                style={styles.editableRow}
                onPress={() => handleEditField('address2')}
              >
                <View style={styles.infoRow}>
                  <FontAwesome name="map-pin" size={20} color="#666" style={styles.icon} />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Secondary Address</Text>
                    <Text style={styles.value}>
                      {userData.address2 || 'Not set'}
                    </Text>
                  </View>
                  <FontAwesome name="pencil" size={16} color="#FDB515" />
                </View>
              </TouchableOpacity>

              <View style={styles.separator} />

              {/* Mobile Number */}
              <TouchableOpacity 
                style={styles.editableRow}
                onPress={() => handleEditField('mobileNumber')}
              >
                <View style={styles.infoRow}>
                  <FontAwesome name="phone" size={20} color="#666" style={styles.icon} />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <Text style={styles.value}>
                      {userData.mobileNumber || 'Not set'}
                    </Text>
                  </View>
                  <FontAwesome name="pencil" size={16} color="#FDB515" />
                </View>
              </TouchableOpacity>

              <View style={styles.separator} />

              {/* Serviceable Pincodes */}
              <TouchableOpacity 
                style={styles.editableRow}
                onPress={() => handleEditField('serviceablePincodes')}
              >
                <View style={styles.infoRow}>
                  <FontAwesome name="map-o" size={20} color="#666" style={styles.icon} />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Serviceable Pincodes</Text>
                    <Text style={styles.value}>
                      {userData.serviceablePincodes && userData.serviceablePincodes.length > 0
                        ? userData.serviceablePincodes.join(', ')
                        : 'Not set'}
                    </Text>
                  </View>
                  <FontAwesome name="pencil" size={16} color="#FDB515" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="cog" size={20} color="#FDB515" />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="question-circle" size={20} color="#FDB515" />
                <Text style={styles.actionButtonText}>Help & Support</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <FontAwesome name="sign-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.noDataText}>No user data available</Text>
          </View>
        )}

        {/* Edit Modal */}
        <EditModal
          visible={editModalVisible}
          field={editingField}
          value={editValue}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveField}
          isLoading={updateProfileMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
    marginTop: 50,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FDB515',
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FDB515',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF9E6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  editableRow: {
    // No additional styles needed, just for touchable
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2416',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2D2416',
    marginLeft: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#FDB515',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});