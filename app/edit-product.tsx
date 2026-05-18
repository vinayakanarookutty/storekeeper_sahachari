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
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { getToken } from './services/auth';
import { styles } from './styles/edit-product.style';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_URL ||
  'https://sahachari-uploads.s3.ap-south-1.amazonaws.com';

const PRODUCT_CATEGORIES = [
  'Food',
  'Vegetables and Fruits',
  'Groceries',
  'Home Made',
  'Service',
  'Fish & Meat',
];

const UNITS = [
  'kg',
  'grams',
  'liters',
  'ml',
  'pcs',
  'packet',
  'box',
];

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

  // Product Data
  const productData = params.product
    ? JSON.parse(params.product as string)
    : null;

  // States
  const [name, setName] = useState(productData?.name || '');
  const [description, setDescription] = useState(
    productData?.description || ''
  );

  const [price, setPrice] = useState(
    productData?.price?.toString() || ''
  );

  const [quantity, setQuantity] = useState(
    productData?.quantity?.toString() || ''
  );

  const [category, setCategory] = useState(
    productData?.category || ''
  );

  const [unit, setUnit] = useState('kg');

  const [selectedImages, setSelectedImages] =
    useState<string[]>([]);

  const [existingImages, setExistingImages] =
    useState<string[]>(productData?.images || []);

  const [uploadedImageKeys, setUploadedImageKeys] =
    useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);

  const [showUnitModal, setShowUnitModal] =
    useState(false);

  const isService = category === 'Service';

  // UPDATE PRODUCT
  const updateProductMutation = useMutation({
    mutationFn: async (updatedData: ProductData) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/storekeeper/products/${
          productData._id || params.id
        }`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.message ||
            'Failed to update product'
        );
      }

      return response.json();
    },

    onSuccess: () => {
      Alert.alert(
        'Success',
        'Updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              queryClient.invalidateQueries({
                queryKey: ['products'],
              });

              router.back();
            },
          },
        ]
      );
    },

    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  // PICK IMAGES
  const pickImages = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      return Alert.alert(
        'Permission needed',
        'Grant access to photos'
      );
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

    if (!result.canceled) {
      setSelectedImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  };

  // UPLOAD IMAGES
  const uploadImages = async () => {
    setIsUploading(true);

    const imageKeys: string[] = [];

    try {
      const token = await getToken();

      for (const uri of selectedImages) {
        const fileName = `edit_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 5)}.jpg`;

        const presignedRes = await fetch(
          `${API_BASE_URL}/s3/presigned-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName,
              fileType: 'image/jpeg',
              folder: 'uploads',
            }),
          }
        );

        const { url, key } =
          await presignedRes.json();

        const imgBlob = await (
          await fetch(uri)
        ).blob();

        await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
          },
          body: imgBlob,
        });

        imageKeys.push(key);
      }

      setUploadedImageKeys(imageKeys);

      Alert.alert(
        'Success',
        'New images uploaded!'
      );
    } catch (e) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // UPDATE BUTTON
  const handleUpdateProduct = () => {
    if (!name || !price || !category) {
      return Alert.alert(
        'Error',
        'Required fields missing'
      );
    }

    const processedExistingKeys =
      existingImages
        .map((img) =>
          img.replace(`${S3_BASE_URL}/`, '')
        )
        .filter(Boolean) as string[];

    const finalImagesKeys = [
      ...processedExistingKeys,
      ...uploadedImageKeys,
    ];

    if (finalImagesKeys.length === 0) {
      return Alert.alert(
        'Error',
        'Product requires at least one image'
      );
    }

    updateProductMutation.mutate({
  name,
  description,
  price, // keep full value like 80/kg
  quantity: isService
    ? 100
    : parseInt(quantity),
  category,
  images: finalImagesKeys,
});
  };

  // MODAL
  const SelectionModal = ({
    visible,
    data,
    title,
    onSelect,
    onClose,
  }: any) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <TouchableWithoutFeedback
        onPress={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {title}
              </Text>
            </View>

            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => onSelect(item)}
                >
                  <Text
                    style={styles.modalItemText}
                  >
                    {item}
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
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Edit Details
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <FontAwesome
            name="times"
            size={24}
            color="#2D2416"
          />
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <ScrollView
        contentContainerStyle={styles.content}
      >
        {/* CATEGORY */}
        <Text style={styles.label}>
          Category
        </Text>

        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() =>
            setShowCategoryModal(true)
          }
        >
          <TextInput
            style={[
              styles.input,
              { marginBottom: 0 },
            ]}
            value={category}
            editable={false}
            placeholder="Select Category"
          />

          <FontAwesome
            name="chevron-down"
            size={14}
            color="#A89378"
            style={styles.inputIcon}
          />
        </TouchableOpacity>

        {/* NAME */}
        <Text style={styles.label}>
          Product/Service Name
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter Name"
        />

        {/* DESCRIPTION */}
        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.textArea,
          ]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Enter Description"
        />

        {/* PRICE */}
        <Text style={styles.label}>
          Price (Numeric)
        </Text>

        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0.00"
        />

        {/* QUANTITY */}
        {!isService && (
          <>
            <Text style={styles.label}>
              Stock Quantity
            </Text>

            <View
              style={styles.parallelContainer}
            >
              <TextInput
                style={[
                  styles.input,
                  { flex: 2 },
                ]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="0"
              />

              <TouchableOpacity
                style={styles.unitSelector}
                onPress={() =>
                  setShowUnitModal(true)
                }
              >
                <Text style={styles.unitText}>
                  {unit}
                </Text>

                <FontAwesome
                  name="caret-down"
                  size={16}
                  color="#DAA520"
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* IMAGE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Manage Images
          </Text>

          {/* EXISTING IMAGES */}
          {existingImages.length > 0 && (
            <View
              style={styles.imagesContainer}
            >
              {existingImages.map(
                (imageKey, i) => {
                  const imageUri =
                    imageKey.startsWith(
                      'https'
                    )
                      ? imageKey
                      : `${S3_BASE_URL}/${imageKey}`;

                  return (
                    <View
                      key={i}
                      style={
                        styles.imageWrapper
                      }
                    >
                      <Image
                        source={{
                          uri: imageUri,
                        }}
                        style={
                          styles.imagePreview
                        }
                        resizeMode="cover"
                      />

                      <TouchableOpacity
                        style={
                          styles.removeButton
                        }
                        onPress={() =>
                          setExistingImages(
                            (prev) =>
                              prev.filter(
                                (_, idx) =>
                                  idx !== i
                              )
                          )
                        }
                      >
                        <Text
                          style={
                            styles.removeButtonText
                          }
                        >
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
              )}
            </View>
          )}

          {/* PICK BUTTON */}
          <TouchableOpacity
            style={styles.pickButton}
            onPress={pickImages}
          >
            <FontAwesome
              name="plus"
              size={20}
              color="#DAA520"
            />

            <Text
              style={styles.pickButtonText}
            >
              Select New Images
            </Text>
          </TouchableOpacity>

          {/* NEW IMAGE PREVIEW */}
          {selectedImages.length > 0 && (
            <View
              style={[
                styles.imagesContainer,
                { marginTop: 15 },
              ]}
            >
              {selectedImages.map(
                (uri, i) => (
                  <View
                    key={i}
                    style={
                      styles.imageWrapper
                    }
                  >
                    <Image
                      source={{ uri }}
                      style={
                        styles.imagePreview
                      }
                      resizeMode="cover"
                    />

                    <TouchableOpacity
                      style={
                        styles.removeButton
                      }
                      onPress={() =>
                        setSelectedImages(
                          (prev) =>
                            prev.filter(
                              (_, idx) =>
                                idx !== i
                            )
                        )
                      }
                    >
                      <Text
                        style={
                          styles.removeButtonText
                        }
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          )}

          {/* UPLOAD BUTTON */}
          {selectedImages.length > 0 &&
            uploadedImageKeys.length ===
              0 && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={uploadImages}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={
                      styles.uploadButtonText
                    }
                  >
                    Upload New Selection
                  </Text>
                )}
              </TouchableOpacity>
            )}
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[
            styles.createButton,
            updateProductMutation.isPending &&
              styles.buttonDisabled,
          ]}
          onPress={handleUpdateProduct}
          disabled={
            updateProductMutation.isPending
          }
        >
          <Text
            style={styles.createButtonText}
          >
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CATEGORY MODAL */}
      <SelectionModal
        visible={showCategoryModal}
        data={PRODUCT_CATEGORIES}
        title="Category"
        onSelect={(v: string) => {
          setCategory(v);
          setShowCategoryModal(false);
        }}
        onClose={() =>
          setShowCategoryModal(false)
        }
      />

      {/* UNIT MODAL */}
      <SelectionModal
        visible={showUnitModal}
        data={UNITS}
        title="Unit"
        onSelect={(v: string) => {
          setUnit(v);
          setShowUnitModal(false);
        }}
        onClose={() =>
          setShowUnitModal(false)
        }
      />
    </View>
  );
}