import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/auth';
import { styles } from '../tab_style/two.style';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_BASE_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

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

interface CommissionData {
  storekeeperId: string;
  percentage: number;
}

interface EditModalProps {
  visible: boolean;
  field: string | null;
  value: string;
  onClose: () => void;
  onSave: (field: string, value: string) => void;
  isLoading: boolean;
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  cancelText = 'Cancel',
  confirmText = 'Log Out'
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);

    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: cancelText,
        style: 'cancel',
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  }
};

/* =========================================================
   EDIT MODAL
========================================================= */

function EditModal({
  visible,
  field,
  value,
  onClose,
  onSave,
  isLoading,
}: EditModalProps) {
  const [editValue, setEditValue] = useState(value);

  const { language, t } = useLanguage();

  useEffect(() => {
    if (visible) {
      setEditValue(value);
    }
  }, [visible, value]);

  const getFieldLabel = () => {
    switch (field) {
      case 'address':
        return t.primaryAddress;

      case 'address2':
        return language === 'ml'
          ? 'രണ്ടാം വിലാസം'
          : t.secondaryAddress;

      case 'mobileNumber':
        return t.mobileNumber;

      default:
        return '';
    }
  };

  const getModalTitle = () => {
    if (language === 'ml') {
      switch (field) {
        case 'mobileNumber':
          return 'മൊബൈൽ നമ്പർ ഉറപ്പാക്കുക';

        case 'address':
          return 'പ്രധാന വിലാസം ഉറപ്പാക്കുക';

        case 'address2':
          return 'രണ്ടാം വിലാസം ഉറപ്പാക്കുക';

        default:
          return t.confirmTitle || 'ഉറപ്പാക്കുക';
      }
    }

    return `${t.confirmTitle || 'Edit'} ${getFieldLabel()}`;
  };

  const cancelLabel =
    language === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel';

  const saveLabel =
    language === 'ml' ? 'സേവ് ചെയ്യുക' : 'Save';

  const isMobileField = field === 'mobileNumber';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {getModalTitle()}
            </Text>

            <TouchableOpacity
              onPress={onClose}
              disabled={isLoading}
            >
              <FontAwesome
                name="times"
                size={20}
                color={COLORS.textDark}
              />
            </TouchableOpacity>
          </View>

          {/* Mobile validation message */}
          {isMobileField && (
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textLight,
                marginBottom: 8,
              }}
            >
              {language === 'ml'
                ? '10 അക്കമുള്ള മൊബൈൽ നമ്പർ മാത്രം നൽകുക.'
                : 'Enter exactly 10 digits.'}
            </Text>
          )}

          <TextInput
            style={[
              styles.modalInput,
              (field === 'address' ||
                field === 'address2') &&
                styles.textArea,
            ]}
            value={editValue}
            onChangeText={(text) => {
              if (isMobileField) {
                // Remove everything except numbers
                const numbersOnly = text
                  .replace(/[^0-9]/g, '')
                  .slice(0, 10);

                setEditValue(numbersOnly);
              } else {
                setEditValue(text);
              }
            }}
            placeholder={
              isMobileField
                ? language === 'ml'
                  ? '10 അക്കമുള്ള മൊബൈൽ നമ്പർ'
                  : '10 digit mobile number'
                : '...'
            }
            multiline={
              field === 'address' ||
              field === 'address2'
            }
            keyboardType={
              isMobileField
                ? 'number-pad'
                : 'default'
            }
            maxLength={
              isMobileField
                ? 10
                : undefined
            }
            editable={!isLoading}
          />

          {/* Mobile digit counter */}
          {isMobileField && (
            <Text
              style={{
                fontSize: 12,
                color:
                  editValue.length === 10
                    ? '#2E7D32'
                    : COLORS.textLight,
                textAlign: 'right',
                marginTop: 4,
              }}
            >
              {editValue.length}/10
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.modalButtons}>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                isLoading && { opacity: 0.7 },
              ]}
              onPress={() => {
                if (field) {
                  onSave(field, editValue);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {saveLabel}
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function TabTwoScreen() {
  const { token, clearAuthToken } = useAuth();

  const router = useRouter();

  const queryClient = useQueryClient();

  const { language, setLanguage, t } =
    useLanguage();

  const [editModalVisible, setEditModalVisible] =
    useState(false);

  const [editingField, setEditingField] =
    useState<string | null>(null);

  const [editInitialValue, setEditInitialValue] =
    useState('');

  const [refreshing, setRefreshing] =
    useState(false);

  /* =========================================================
     GET CURRENT USER
  ========================================================= */

  const {
    data: userData,
    refetch: refetchUser,
  } = useQuery<UserProfile>({
    queryKey: ['currentUser'],

    queryFn: async () => {
      const authToken = await getToken();

      const res = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(
          'Failed to fetch user'
        );
      }

      return res.json();
    },

    enabled: !!token,
  });

  /* =========================================================
     COMMISSION
  ========================================================= */

  const {
    data: commissionData,
    refetch: refetchCommission,
    isLoading: isCommissionLoading,
  } = useQuery<CommissionData>({
    queryKey: [
      'storekeeperCommission',
      userData?._id,
    ],

    queryFn: async () => {
      const authToken = await getToken();

      const res = await fetch(
        `${API_BASE_URL}/commission/store/${userData?._id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (res.status === 404) {
        return {
          storekeeperId:
            userData?._id || '',
          percentage: 0,
        };
      }

      if (!res.ok) {
        throw new Error(
          'Failed to fetch commission data'
        );
      }

      return res.json();
    },

    enabled:
      !!token &&
      !!userData?._id,
  });

  /* =========================================================
     REFRESH
  ========================================================= */

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        refetchUser(),
        refetchCommission(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchUser,
    refetchCommission,
  ]);

  /* =========================================================
     UPDATE PROFILE
  ========================================================= */

  const updateProfileMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: string;
      value: string;
    }) => {
      /*
       * SECURITY:
       * Pincode is NOT allowed to be changed
       * from this screen.
       */
      if (field === 'serviceablePincodes') {
        throw new Error(
          language === 'ml'
            ? 'പിൻകോഡ് മാറ്റാൻ കഴിയില്ല.'
            : 'Pincode cannot be changed.'
        );
      }

      /*
       * MOBILE VALIDATION
       */
      if (field === 'mobileNumber') {
        const mobile = value
          .replace(/[^0-9]/g, '');

        if (mobile.length !== 10) {
          throw new Error(
            language === 'ml'
              ? 'മൊബൈൽ നമ്പർ 10 അക്കമുള്ളതായിരിക്കണം.'
              : 'Mobile number must contain exactly 10 digits.'
          );
        }

        value = mobile;
      }

      const authToken = await getToken();

      const body: Record<string, string> = {
        [field]: value,
      };

      const response = await fetch(
        `${API_BASE_URL}/users/update-me`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${authToken}`,
          },

          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        let errorMessage =
          'Failed to update profile';

        try {
          const error =
            await response.json();

          errorMessage =
            error.message ||
            errorMessage;
        } catch {
          // Ignore invalid JSON response
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['currentUser'],
      });

      setEditModalVisible(false);

      showAlert(
        t.successTitle ||
          (language === 'ml'
            ? 'സക്സസ്'
            : 'Success'),

        t.statusUpdatedSuccess ||
          (language === 'ml'
            ? 'പ്രൊഫൈൽ വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു!'
            : 'Profile updated successfully!')
      );
    },

    onError: (error: any) => {
      showAlert(
        t.failedTitle ||
          (language === 'ml'
            ? 'എറർ'
            : 'Error'),

        error.message ||
          'Failed to update profile'
      );
    },
  });

  /* =========================================================
     UPLOAD AVATAR
  ========================================================= */

  const uploadAvatarMutation = useMutation({
    mutationFn: async (
      imageUri: string
    ) => {
      const authToken = await getToken();

      let cleanPath =
        imageUri
          .split(':http')[0]
          .replace('blob:', '');

      const extensionMatch =
        cleanPath.match(
          /\.([a-zA-Z0-9]+)$/
        );

      const fileExtension =
        extensionMatch
          ? extensionMatch[1].toLowerCase()
          : 'jpg';

      const fileName =
        `avatar_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.${fileExtension}`;

      const fileType =
        fileExtension === 'png'
          ? 'image/png'
          : 'image/jpeg';

      const presignedResponse =
        await fetch(
          `${API_BASE_URL}/s3/presigned-url`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${authToken}`,
            },

            body: JSON.stringify({
              fileName,
              fileType,
              folder: 'avatars',
            }),
          }
        );

      if (!presignedResponse.ok) {
        throw new Error(
          'Failed to get upload URL'
        );
      }

      const {
        url: presignedUrl,
        key,
      } =
        await presignedResponse.json();

      const imageResponse =
        await fetch(imageUri);

      const blob =
        await imageResponse.blob();

      const uploadResponse =
        await fetch(
          presignedUrl,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                fileType,
            },

            body: blob,
          }
        );

      if (!uploadResponse.ok) {
        throw new Error(
          'S3 Upload failed'
        );
      }

      const updateResponse =
        await fetch(
          `${API_BASE_URL}/users/update-me`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${authToken}`,
            },

            body: JSON.stringify({
              image: key,
            }),
          }
        );

      if (!updateResponse.ok) {
        throw new Error(
          'Failed to link profile picture'
        );
      }

      return updateResponse.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['currentUser'],
      });

      showAlert(
        t.successTitle ||
          (language === 'ml'
            ? 'സക്സസ്'
            : 'Success'),

        language === 'ml'
          ? 'പ്രൊഫൈൽ ചിത്രം മാറ്റിയിരിക്കുന്നു!'
          : 'Profile picture updated!'
      );
    },

    onError: (error: any) => {
      showAlert(
        t.failedTitle ||
          (language === 'ml'
            ? 'എറർ'
            : 'Error'),

        error.message ||
          'Upload failed'
      );
    },
  });

  /* =========================================================
     PICK IMAGE
  ========================================================= */

  const handlePickImage =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            allowsEditing: true,

            aspect: [1, 1],

            quality: 0.7,
          }
        );

      if (!result.canceled) {
        uploadAvatarMutation.mutate(
          result.assets[0].uri
        );
      }
    };

  /* =========================================================
     OPEN EDIT MODAL
  ========================================================= */

  const handleEditPress = (
    field: keyof UserProfile
  ) => {
    /*
     * NEVER open an edit modal for pincode.
     */
    if (
      field ===
      'serviceablePincodes'
    ) {
      return;
    }

    let val = '';

    if (userData) {
      const rawVal =
        userData[field];

      if (Array.isArray(rawVal)) {
        val = rawVal.join(', ');
      } else {
        val =
          (rawVal as string) || '';
      }
    }

    setEditingField(
      field as string
    );

    setEditInitialValue(val);

    setEditModalVisible(true);
  };

  /* =========================================================
     PLACEHOLDER
  ========================================================= */

  const getPlaceholderValue = (
    field: string,
    label: string
  ) => {
    if (language === 'ml') {
      if (
        field ===
        'mobileNumber'
      ) {
        return 'മൊബൈൽ നമ്പർ ചേർക്കുക';
      }

      if (
        field === 'address'
      ) {
        return 'പ്രധാന വിലാസം ചേർക്കുക';
      }

      if (
        field === 'address2'
      ) {
        return 'രണ്ടാം വിലാസം ചേർക്കുക';
      }

      return `${label} ചേർക്കുക`;
    }

    return `Add ${label?.toLowerCase()}`;
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      contentContainerStyle={
        styles.scrollContent
      }
    >

      {/* =====================================================
          PROFILE HEADER
      ===================================================== */}

      <View style={styles.header}>

        <View style={styles.avatarWrapper}>

          {uploadAvatarMutation.isPending ? (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <ActivityIndicator
                color={
                  COLORS.primary
                }
              />
            </View>
          ) : userData?.image ? (
            <Image
              source={{
                uri: `${S3_BASE_URL}/${userData.image}`,
              }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <FontAwesome
                name="user"
                size={50}
                color={
                  COLORS.primary
                }
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.camBtn}
            onPress={
              handlePickImage
            }
            disabled={
              uploadAvatarMutation.isPending
            }
          >
            <FontAwesome
              name="camera"
              size={14}
              color="#fff"
            />
          </TouchableOpacity>

        </View>

        <Text
          style={styles.userName}
        >
          {userData?.name ||
            (language === 'ml'
              ? 'ഉപയോക്താവ്'
              : 'User')}
        </Text>

        <Text
          style={styles.userEmail}
        >
          {userData?.email}
        </Text>

      </View>

      {/* =====================================================
          BUSINESS RATES
      ===================================================== */}

      <View style={styles.section}>

        <Text
          style={styles.sectionTitle}
        >
          {language === 'ml'
            ? 'ബിസിനസ് വിവരങ്ങൾ'
            : 'Business Rates'}
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                '#FFFDF6',

              borderColor:
                '#F5E6C4',

              borderStyle:
                'solid',

              borderWidth: 1,
            },
          ]}
        >

          <View
            style={
              styles.infoIconBg
            }
          >
            <FontAwesome
              name="percent"
              size={14}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >

            <Text
              style={
                styles.infoLabel
              }
            >
              {language === 'ml'
                ? 'വിൽപന ലാഭം'
                : 'Platform Fee Percentage'}
            </Text>

            {isCommissionLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.primary
                }
                style={{
                  alignSelf:
                    'flex-start',
                  marginTop: 4,
                }}
              />
            ) : (
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      COLORS.textDark,
                    fontWeight:
                      '700',
                    fontSize: 16,
                    marginTop: 2,
                  },
                ]}
              >
                {commissionData?.percentage !==
                undefined
                  ? `${commissionData.percentage}%`
                  : '0%'}
              </Text>
            )}

            <Text
              style={{
                fontSize: 11,
                color: '#666',
                marginTop: 2,
              }}
            >
              {language === 'ml'
                ? '* ഈ ശതമാനം നിങ്ങളുടെ വിൽപന തുകയിൽ നിന്ന് ഈടാക്കുന്നതാണ്.'
                : '* This percentage is automatically charged from your items total sales.'}
            </Text>

          </View>
        </View>

      </View>

      {/* =====================================================
          LANGUAGE
      ===================================================== */}

      <View style={styles.section}>

        <Text
          style={styles.sectionTitle}
        >
          {language === 'ml'
            ? 'ഭാഷ തിരഞ്ഞെടുക്കുക'
            : 'Application Language'}
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              justifyContent:
                'space-between',
              alignItems:
                'center',
            },
          ]}
        >

          <View
            style={{
              flexDirection:
                'row',
              alignItems:
                'center',
              gap: 12,
            }}
          >

            <View
              style={
                styles.infoIconBg
              }
            >
              <FontAwesome
                name="language"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.infoLabel
              }
            >
              {language === 'ml'
                ? 'നിലവിലെ ഭാഷ'
                : 'Active Language'}
            </Text>

          </View>

          <View
            style={{
              flexDirection:
                'row',
              gap: 8,
            }}
          >

            <TouchableOpacity
              onPress={() =>
                setLanguage('en')
              }
              style={{
                backgroundColor:
                  language === 'en'
                    ? COLORS.primary
                    : '#F4F4F4',

                paddingHorizontal:
                  14,

                paddingVertical: 6,

                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color:
                    language === 'en'
                      ? '#FFF'
                      : COLORS.textDark,

                  fontWeight:
                    'bold',
                }}
              >
                EN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setLanguage('ml')
              }
              style={{
                backgroundColor:
                  language === 'ml'
                    ? COLORS.primary
                    : '#F4F4F4',

                paddingHorizontal:
                  14,

                paddingVertical: 6,

                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color:
                    language === 'ml'
                      ? '#FFF'
                      : COLORS.textDark,

                  fontWeight:
                    'bold',
                }}
              >
                മലയാളം
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </View>

      {/* =====================================================
          CONTACT INFORMATION
      ===================================================== */}

      <View style={styles.section}>

        <Text
          style={styles.sectionTitle}
        >
          {t.contactInformation}
        </Text>

        {/* MOBILE NUMBER */}

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() =>
            handleEditPress(
              'mobileNumber'
            )
          }
        >

          <View
            style={
              styles.infoIconBg
            }
          >
            <FontAwesome
              name="phone"
              size={16}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >

            <Text
              style={
                styles.infoLabel
              }
            >
              {t.mobileNumber}
            </Text>

            <Text
              style={
                styles.infoValue
              }
              numberOfLines={1}
            >
              {userData?.mobileNumber ||
                getPlaceholderValue(
                  'mobileNumber',
                  t.mobileNumber
                )}
            </Text>

          </View>

          <FontAwesome
            name="chevron-right"
            size={12}
            color={
              COLORS.border
            }
          />

        </TouchableOpacity>

        {/* PRIMARY ADDRESS */}

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() =>
            handleEditPress(
              'address'
            )
          }
        >

          <View
            style={
              styles.infoIconBg
            }
          >
            <FontAwesome
              name="map-marker"
              size={16}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >

            <Text
              style={
                styles.infoLabel
              }
            >
              {t.primaryAddress}
            </Text>

            <Text
              style={
                styles.infoValue
              }
              numberOfLines={1}
            >
              {userData?.address ||
                getPlaceholderValue(
                  'address',
                  t.primaryAddress
                )}
            </Text>

          </View>

          <FontAwesome
            name="chevron-right"
            size={12}
            color={
              COLORS.border
            }
          />

        </TouchableOpacity>

        {/* SECONDARY ADDRESS */}

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() =>
            handleEditPress(
              'address2'
            )
          }
        >

          <View
            style={
              styles.infoIconBg
            }
          >
            <FontAwesome
              name="building"
              size={16}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >

            <Text
              style={
                styles.infoLabel
              }
            >
              {language === 'ml'
                ? 'രണ്ടാം വിലാസം'
                : t.secondaryAddress}
            </Text>

            <Text
              style={
                styles.infoValue
              }
              numberOfLines={1}
            >
              {userData?.address2 ||
                getPlaceholderValue(
                  'address2',
                  t.secondaryAddress
                )}
            </Text>

          </View>

          <FontAwesome
            name="chevron-right"
            size={12}
            color={
              COLORS.border
            }
          />

        </TouchableOpacity>

        {/* ===================================================
            PINCODE - LOCKED / NON EDITABLE
        =================================================== */}

        <View
          style={styles.infoCard}
        >

          <View
            style={
              styles.infoIconBg
            }
          >
            <FontAwesome
              name="envelope-o"
              size={16}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >

            <Text
              style={
                styles.infoLabel
              }
            >
              {t.servicePincodes}
            </Text>

            <Text
              style={
                styles.infoValue
              }
              numberOfLines={1}
            >
              {userData?.serviceablePincodes &&
              userData.serviceablePincodes.length >
                0
                ? userData.serviceablePincodes.join(
                    ', '
                  )
                : language === 'ml'
                  ? 'പിൻകോഡ് ലഭ്യമല്ല'
                  : 'Pincode not available'}
            </Text>

            <Text
              style={{
                fontSize: 11,
                color:
                  COLORS.textLight,
                marginTop: 4,
              }}
            >
              {language === 'ml'
                ? 'ഈ പിൻകോഡ് സൂപ്പർ അഡ്മിൻ നിശ്ചയിച്ചതാണ്. ഇത് മാറ്റാൻ കഴിയില്ല.'
                : 'This pincode is assigned by the Super Admin and cannot be changed.'}
            </Text>

          </View>

          {/* LOCK ICON */}

          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor:
                '#F5F0E5',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >
            <FontAwesome
              name="lock"
              size={13}
              color={
                COLORS.textLight
              }
            />
          </View>

        </View>

      </View>

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          const logOutTitle =
            t.logout ||
            (language === 'ml'
              ? 'ലോഗ് ഔട്ട്'
              : 'Logout');

          const logoutMsg =
            language === 'ml'
              ? 'നിങ്ങൾക്ക് തീർച്ചയായും ലോഗ് ഔട്ട് ചെയ്യണോ?'
              : 'Are you sure you want to logout?';

          const cancelLabel =
            language === 'ml'
              ? 'റദ്ദാക്കുക'
              : 'Cancel';

          const confirmLabel =
            language === 'ml'
              ? 'ലോഗ് ഔട്ട്'
              : 'Log Out';

          showConfirm(
            logOutTitle,
            logoutMsg,

            async () => {
              await clearAuthToken();

              router.replace(
                '/login'
              );
            },

            cancelLabel,
            confirmLabel
          );
        }}
      >
        <Text
          style={
            styles.logoutText
          }
        >
          {t.logout}
        </Text>
      </TouchableOpacity>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      <EditModal
        visible={
          editModalVisible
        }

        field={
          editingField
        }

        value={
          editInitialValue
        }

        onClose={() =>
          setEditModalVisible(
            false
          )
        }

        isLoading={
          updateProfileMutation.isPending
        }

        onSave={(
          field,
          value
        ) => {

          /* -----------------------------------------------
             PINCODE SECURITY
          ------------------------------------------------ */

          if (
            field ===
            'serviceablePincodes'
          ) {
            showAlert(
              language === 'ml'
                ? 'അനുമതിയില്ല'
                : 'Not Allowed',

              language === 'ml'
                ? 'പിൻകോഡ് മാറ്റാൻ കഴിയില്ല.'
                : 'Pincode cannot be changed.'
            );

            return;
          }

          /* -----------------------------------------------
             MOBILE VALIDATION
          ------------------------------------------------ */

          if (
            field ===
            'mobileNumber'
          ) {
            const mobile =
              value
                .replace(
                  /[^0-9]/g,
                  ''
                );

            if (
              mobile.length !== 10
            ) {
              showAlert(
                language === 'ml'
                  ? 'അസാധുവായ മൊബൈൽ നമ്പർ'
                  : 'Invalid Mobile Number',

                language === 'ml'
                  ? 'മൊബൈൽ നമ്പർ കൃത്യമായി 10 അക്കമുള്ളതായിരിക്കണം.'
                  : 'Mobile number must contain exactly 10 digits.'
              );

              return;
            }

            /*
             * Optional Indian mobile validation:
             * first digit should be 6, 7, 8 or 9.
             */
            if (
              !/^[6-9][0-9]{9}$/.test(
                mobile
              )
            ) {
              showAlert(
                language === 'ml'
                  ? 'അസാധുവായ മൊബൈൽ നമ്പർ'
                  : 'Invalid Mobile Number',

                language === 'ml'
                  ? 'ശരിയായ ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക.'
                  : 'Please enter a valid Indian mobile number.'
              );

              return;
            }

            updateProfileMutation.mutate(
              {
                field,
                value: mobile,
              }
            );

            return;
          }

          /* -----------------------------------------------
             ADDRESS / OTHER ALLOWED FIELDS
          ------------------------------------------------ */

          updateProfileMutation.mutate({
            field,
            value,
          });
        }}
      />

    </ScrollView>
  );
}