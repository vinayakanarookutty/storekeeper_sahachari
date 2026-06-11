import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';

import { FontAwesome } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function BulkUploadScreen() {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /* =========================
     PICK FILE
  ========================= */

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      setSelectedFile(file);
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'Failed to select file'
      );
    }
  };

  /* =========================
     IMPORT PRODUCTS
  ========================= */

  const handleImport = async () => {
  try {
    if (!selectedFile) {
      Alert.alert('No File', 'Please choose an Excel or CSV file');
      return;
    }

    setLoading(true);

    const formData = new FormData();

    // ==========================================
    //  FIX: HANDLE WEB VS MOBILE FILE ATTACHMENT
    // ==========================================
    if (Platform.OS === 'web') {
      // On web, expo-document-picker provides the native DOM File object under .file
      if (selectedFile.file) {
        formData.append('file', selectedFile.file);
      } else {
        // Fallback if .file is missing: Convert the URI/base64 to a real Blob object
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name);
      }
    } else {
      // On Native Mobile (iOS / Android)
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type:
          selectedFile.mimeType ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);
    }

    // GET TOKEN
    let token = '';
    if (Platform.OS === 'web') {
      token = localStorage.getItem('jwt_token') || '';
    } else {
      token = (await AsyncStorage.getItem('jwt_token')) || '';
    }

    // Send the request
    const response = await axios.post(
      `${API_URL}/storekeeper/bulk-upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          // Let the browser/operating system set the multi-part boundaries automatically
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    Alert.alert(
      'Success',
      `${response.data.count || 0} products imported successfully`
    );

    setSelectedFile(null);
  } catch (error: any) {
    console.log("Upload Error:", error?.response?.data || error);

    Alert.alert(
      'Upload Failed',
      error?.response?.data?.message || 'Something went wrong'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      {/* =========================
          HEADER
      ========================= */}

      <Text style={styles.title}>
        Bulk Upload Products
      </Text>

      <Text style={styles.subtitle}>
        Upload Excel or CSV files to import
        products quickly
      </Text>

      {/* =========================
          FILE PICKER
      ========================= */}

      <TouchableOpacity
        style={styles.uploadBox}
        onPress={pickFile}
        activeOpacity={0.8}
      >
        <FontAwesome
          name="cloud-upload"
          size={42}
          color="#DAA520"
        />

        <Text style={styles.uploadText}>
          Tap to choose file
        </Text>

        <Text style={styles.supportText}>
          Supports .xlsx and .csv
        </Text>

        {selectedFile && (
          <View style={styles.filePreview}>
            <FontAwesome
              name="file-excel-o"
              size={18}
              color="#1A140B"
            />

            <Text
              style={styles.fileName}
              numberOfLines={1}
            >
              {selectedFile.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* =========================
          IMPORT BUTTON
      ========================= */}

      <TouchableOpacity
        style={[
          styles.importButton,
          loading && styles.disabledButton,
        ]}
        onPress={handleImport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <FontAwesome
              name="upload"
              size={16}
              color="#fff"
            />

            <Text style={styles.importButtonText}>
              Import Products
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF0',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A140B',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    lineHeight: 22,
    marginBottom: 30,
  },

  uploadBox: {
    minHeight: 240,

    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DAA520',

    borderRadius: 24,

    backgroundColor: '#FFF9E8',

    justifyContent: 'center',
    alignItems: 'center',

    padding: 24,
  },

  uploadText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A140B',
  },

  supportText: {
    marginTop: 8,
    fontSize: 13,
    color: '#777',
  },

  filePreview: {
    marginTop: 24,

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#fff',

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 12,

    width: '100%',
  },

  fileName: {
    marginLeft: 10,
    flex: 1,
    color: '#1A140B',
    fontWeight: '600',
  },

  importButton: {
    marginTop: 30,

    backgroundColor: '#DAA520',

    borderRadius: 16,

    paddingVertical: 16,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 10,

    elevation: 4,

    shadowColor: '#DAA520',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  disabledButton: {
    opacity: 0.7,
  },

  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});