import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useLanguage } from './contexts/LanguageContext';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

const TEMPLATE_BASE_URL =
  process.env.EXPO_PUBLIC_TEMPLATE_BASE_URL;

const COLORS = {
  background: '#FDFCF0',
  card: '#FFFFFF',
  primary: '#DAA520',
  primaryDark: '#B8860B',
  text: '#1A140B',
  textSecondary: '#777777',
  border: '#E8DFC9',
  lightGold: '#FFF9E8',
  success: '#2E7D32',
  danger: '#D32F2F',
};

const showAlert = (
  title: string,
  message: string,
  onConfirm?: () => void
) => {
  if (Platform.OS === 'web') {
    setTimeout(() => {
      alert(`${title}: ${message}`);

      if (onConfirm) {
        onConfirm();
      }
    }, 100);
  } else {
    Alert.alert(
      title,
      message,
      onConfirm
        ? [
            {
              text: 'OK',
              onPress: onConfirm,
            },
          ]
        : undefined
    );
  }
};

export default function BulkUploadScreen() {
  const { t } = useLanguage();

  const router = useRouter();

  const [selectedFile, setSelectedFile] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const [
    downloadingTemplate,
    setDownloadingTemplate,
  ] = useState<'xlsx' | 'csv' | null>(
    null
  );

  /* =========================================================
     BACK BUTTON
  ========================================================= */

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  /* =========================================================
     BLOB -> BASE64
  ========================================================= */

  const blobToBase64 = (
    blob: Blob
  ): Promise<string> => {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () => {
          try {
            const result =
              reader.result?.toString();

            if (!result) {
              reject(
                new Error(
                  'Unable to read file'
                )
              );

              return;
            }

            const base64 =
              result.split(',')[1];

            if (!base64) {
              reject(
                new Error(
                  'Invalid file data'
                )
              );

              return;
            }

            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(
            new Error(
              'Failed to read file'
            )
          );
        };

        reader.readAsDataURL(blob);
      }
    );
  };

  /* =========================================================
     DOWNLOAD TEMPLATE
  ========================================================= */

  const downloadTemplate = async (
    type: 'xlsx' | 'csv'
  ) => {
    try {
      setDownloadingTemplate(type);

      /* -----------------------------------------------------
         CHECK ENV
      ----------------------------------------------------- */

      if (!TEMPLATE_BASE_URL) {
        throw new Error(
          'EXPO_PUBLIC_TEMPLATE_BASE_URL is not configured'
        );
      }

      /* -----------------------------------------------------
         FILE NAME
      ----------------------------------------------------- */

      const fileName =
        type === 'xlsx'
          ? 'products-template.xlsx'
          : 'products-template.csv';

      /* -----------------------------------------------------
         CREATE URL
      ----------------------------------------------------- */

      const baseUrl =
        TEMPLATE_BASE_URL.replace(
          /\/+$/,
          ''
        );

      const templateUrl =
        `${baseUrl}/templates/${fileName}`;

      console.log(
        'Template URL:',
        templateUrl
      );

      /* =====================================================
         WEB
      ===================================================== */

      if (Platform.OS === 'web') {
        const response =
          await fetch(
            templateUrl
          );

        if (!response.ok) {
          throw new Error(
            `Template download failed: HTTP ${response.status}`
          );
        }

        const blob =
          await response.blob();

        const blobUrl =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href = blobUrl;

        link.download =
          fileName;

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

        window.URL.revokeObjectURL(
          blobUrl
        );

        return;
      }

      /* =====================================================
         ANDROID / IOS
      ===================================================== */

      const response =
        await fetch(
          templateUrl
        );

      if (!response.ok) {
        throw new Error(
          `Template download failed: HTTP ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const base64 =
        await blobToBase64(
          blob
        );

      if (!base64) {
        throw new Error(
          'Unable to read template file'
        );
      }

      /* -----------------------------------------------------
         CREATE TEMP FILE
      ----------------------------------------------------- */

      const destination =
        new File(
          Paths.cache,
          fileName
        );

      /* -----------------------------------------------------
         DELETE OLD FILE
      ----------------------------------------------------- */

      if (destination.exists) {
        destination.delete();
      }

      /* -----------------------------------------------------
         WRITE FILE
      ----------------------------------------------------- */

      destination.write(
        base64,
        {
          encoding: 'base64',
        }
      );

      /* -----------------------------------------------------
         SHARE / SAVE
      ----------------------------------------------------- */

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        showAlert(
          'Download',
          'File sharing is not available on this device.'
        );

        return;
      }

      await Sharing.shareAsync(
        destination.uri,
        {
          mimeType:
            type === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv',

          dialogTitle:
            `Save ${fileName}`,

          UTI:
            type === 'xlsx'
              ? 'com.microsoft.excel.xlsx'
              : 'public.comma-separated-values-text',
        }
      );

    } catch (error: any) {
      console.log(
        'Template Download Error:',
        error
      );

      showAlert(
        t.failedTitle ||
          'Download Failed',

        error?.message ||
          'Unable to download template'
      );
    } finally {
      setDownloadingTemplate(
        null
      );
    }
  };

  /* =========================================================
     PICK FILE
  ========================================================= */

  const pickFile = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync(
          {
            type: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/csv',
              'application/csv',
              'text/comma-separated-values',
            ],

            copyToCacheDirectory: true,

            multiple: false,
          }
        );

      if (result.canceled) {
        return;
      }

      const file =
        result.assets[0];

      setSelectedFile(file);

    } catch (error) {
      console.log(
        'File Picker Error:',
        error
      );

      showAlert(
        t.failedTitle ||
          'Error',

        'Failed to select file'
      );
    }
  };

  /* =========================================================
     REMOVE FILE
  ========================================================= */

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  /* =========================================================
     IMPORT PRODUCTS
  ========================================================= */

  const handleImport = async () => {
    try {
      if (!selectedFile) {
        showAlert(
          t.failedTitle ||
            'No File',

          'Please choose an Excel or CSV file'
        );

        return;
      }

      if (!API_URL) {
        showAlert(
          t.failedTitle ||
            'Error',

          'EXPO_PUBLIC_API_URL is not configured'
        );

        return;
      }

      setLoading(true);

      const formData =
        new FormData();

      /* =====================================================
         WEB FILE
      ===================================================== */

      if (Platform.OS === 'web') {
        if (selectedFile.file) {
          formData.append(
            'file',
            selectedFile.file
          );
        } else {
          const response =
            await fetch(
              selectedFile.uri
            );

          const blob =
            await response.blob();

          formData.append(
            'file',
            blob,
            selectedFile.name
          );
        }
      }

      /* =====================================================
         ANDROID / IOS FILE
      ===================================================== */

      else {
        formData.append(
          'file',
          {
            uri:
              selectedFile.uri,

            name:
              selectedFile.name ||
              'products.xlsx',

            type:
              selectedFile.mimeType ||
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          } as any
        );
      }

      /* =====================================================
         GET TOKEN
      ===================================================== */

      let token = '';

      if (Platform.OS === 'web') {
        token =
          localStorage.getItem(
            'jwt_token'
          ) || '';
      } else {
        token =
          (await AsyncStorage.getItem(
            'jwt_token'
          )) || '';
      }

      if (!token) {
        showAlert(
          t.failedTitle ||
            'Authentication Error',

          'Authentication token not found. Please login again.'
        );

        return;
      }

      /* =====================================================
         API
      ===================================================== */

      const response =
        await axios.post(
          `${API_URL}/storekeeper/bulk-upload`,

          formData,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'multipart/form-data',
            },
          }
        );

      /* =====================================================
         SUCCESS
      ===================================================== */

      const count =
        response.data?.count ||
        0;

      showAlert(
        t.successTitle ||
          'Success',

        `${count} products imported successfully`,

        () => {
          setSelectedFile(null);
        }
      );

      setSelectedFile(null);

    } catch (error: any) {
      console.log(
        'Upload Error:',
        error?.response?.data ||
          error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.message ||
        'Something went wrong while uploading the file';

      showAlert(
        t.failedTitle ||
          'Upload Failed',

        Array.isArray(message)
          ? message.join('\n')
          : message
      );

    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <View
      style={
        styles.container
      }
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={styles.header}
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={
            handleBack
          }
          activeOpacity={0.7}
        >
          <FontAwesome
            name="arrow-left"
            size={18}
            color={
              COLORS.text
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerTextContainer
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            {t.bulkUpload ||
              'Bulk Upload Products'}
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Import products quickly
          </Text>
        </View>

        <View
          style={
            styles.headerIcon
          }
        >
          <FontAwesome
            name="cloud-upload"
            size={19}
            color={
              COLORS.primary
            }
          />
        </View>

      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ===================================================
            INTRO
        =================================================== */}

        <View
          style={
            styles.introCard
          }
        >

          <View
            style={
              styles.introIcon
            }
          >
            <FontAwesome
              name="file-excel-o"
              size={20}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={
              styles.introTextContainer
            }
          >
            <Text
              style={
                styles.introTitle
              }
            >
              Import your products
            </Text>

            <Text
              style={
                styles.introDescription
              }
            >
              Download the prepared
              template, fill in your
              products, and upload it
              below.
            </Text>
          </View>

        </View>

        {/* ===================================================
            TEMPLATE
        =================================================== */}

        <View
          style={
            styles.templateCard
          }
        >

          <View
            style={
              styles.templateHeader
            }
          >

            <View
              style={
                styles.templateIcon
              }
            >
              <FontAwesome
                name="download"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.templateTitleContainer
              }
            >
              <Text
                style={
                  styles.templateTitle
                }
              >
                Download Template
              </Text>

              <Text
                style={
                  styles.templateSubtitle
                }
              >
                Use the prepared
                product format
              </Text>
            </View>

          </View>

          <View
            style={
              styles.templateButtons
            }
          >

            {/* XLSX */}

            <TouchableOpacity
              style={
                styles.templateButton
              }
              onPress={() =>
                downloadTemplate(
                  'xlsx'
                )
              }
              disabled={
                downloadingTemplate !==
                null
              }
              activeOpacity={0.8}
            >

              <View
                style={
                  styles.templateFileIcon
                }
              >
                {downloadingTemplate ===
                'xlsx' ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.success
                    }
                  />
                ) : (
                  <FontAwesome
                    name="file-excel-o"
                    size={22}
                    color={
                      COLORS.success
                    }
                  />
                )}
              </View>

              <View
                style={
                  styles.templateButtonText
                }
              >
                <Text
                  style={
                    styles.templateFormat
                  }
                >
                  XLSX
                </Text>

                <Text
                  style={
                    styles.templateDownloadText
                  }
                >
                  Download Excel
                </Text>
              </View>

              <FontAwesome
                name="download"
                size={13}
                color={
                  COLORS.textSecondary
                }
              />

            </TouchableOpacity>

            {/* CSV */}

            <TouchableOpacity
              style={
                styles.templateButton
              }
              onPress={() =>
                downloadTemplate(
                  'csv'
                )
              }
              disabled={
                downloadingTemplate !==
                null
              }
              activeOpacity={0.8}
            >

              <View
                style={
                  styles.templateFileIcon
                }
              >
                {downloadingTemplate ===
                'csv' ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.primary
                    }
                  />
                ) : (
                  <FontAwesome
                    name="file-text-o"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />
                )}
              </View>

              <View
                style={
                  styles.templateButtonText
                }
              >
                <Text
                  style={
                    styles.templateFormat
                  }
                >
                  CSV
                </Text>

                <Text
                  style={
                    styles.templateDownloadText
                  }
                >
                  Download CSV
                </Text>
              </View>

              <FontAwesome
                name="download"
                size={13}
                color={
                  COLORS.textSecondary
                }
              />

            </TouchableOpacity>

          </View>

        </View>

        {/* ===================================================
            UPLOAD
        =================================================== */}

        <View
          style={
            styles.uploadCard
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Upload Completed File
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            Select the completed Excel
            or CSV file from your
            device.
          </Text>

          <TouchableOpacity
            style={
              styles.uploadBox
            }
            onPress={
              pickFile
            }
            activeOpacity={0.85}
            disabled={
              loading
            }
          >

            <View
              style={
                styles.uploadIconCircle
              }
            >
              <FontAwesome
                name="cloud-upload"
                size={30}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.uploadText
              }
            >
              Tap to choose a file
            </Text>

            <Text
              style={
                styles.supportText
              }
            >
              Supports .xlsx and .csv
            </Text>

          </TouchableOpacity>

          {/* SELECTED FILE */}

          {selectedFile && (
            <View
              style={
                styles.fileCard
              }
            >

              <View
                style={
                  styles.fileIcon
                }
              >
                <FontAwesome
                  name="file-excel-o"
                  size={20}
                  color={
                    COLORS.success
                  }
                />
              </View>

              <View
                style={
                  styles.fileInfo
                }
              >
                <Text
                  style={
                    styles.fileLabel
                  }
                >
                  Selected file
                </Text>

                <Text
                  style={
                    styles.fileName
                  }
                  numberOfLines={
                    1
                  }
                >
                  {
                    selectedFile.name
                  }
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.removeButton
                }
                onPress={
                  removeSelectedFile
                }
                disabled={
                  loading
                }
              >
                <FontAwesome
                  name="times"
                  size={15}
                  color={
                    COLORS.danger
                  }
                />
              </TouchableOpacity>

            </View>
          )}

        </View>

        {/* ===================================================
            INFO
        =================================================== */}

        <View
          style={
            styles.infoCard
          }
        >

          <View
            style={
              styles.infoIcon
            }
          >
            <FontAwesome
              name="info-circle"
              size={18}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={
              styles.infoContent
            }
          >

            <Text
              style={
                styles.infoTitle
              }
            >
              Before uploading
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              Download the prepared
              template and do not change
              the column names. Fill in
              the product information and
              upload the completed file.
            </Text>

          </View>

        </View>

        {/* ===================================================
            IMPORT
        =================================================== */}

        <TouchableOpacity
          style={[
            styles.importButton,

            (!selectedFile ||
              loading) &&
              styles.disabledButton,
          ]}
          onPress={
            handleImport
          }
          disabled={
            loading ||
            !selectedFile
          }
          activeOpacity={0.85}
        >

          {loading ? (
            <>
              <ActivityIndicator
                color="#fff"
                size="small"
              />

              <Text
                style={
                  styles.importButtonText
                }
              >
                Importing...
              </Text>
            </>
          ) : (
            <>
              <FontAwesome
                name="upload"
                size={16}
                color="#fff"
              />

              <Text
                style={
                  styles.importButtonText
                }
              >
                Import Products
              </Text>
            </>
          )}

        </TouchableOpacity>

        {/* ===================================================
            CANCEL
        =================================================== */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          onPress={
            handleBack
          }
          disabled={
            loading
          }
          activeOpacity={0.7}
        >
          <Text
            style={
              styles.cancelButtonText
            }
          >
            Cancel
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      COLORS.card,

    paddingHorizontal: 18,

    paddingTop:
      Platform.OS === 'ios'
        ? 58
        : 20,

    paddingBottom: 16,

    borderBottomWidth: 1,

    borderBottomColor:
      COLORS.border,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.04,

    shadowRadius: 4,

    elevation: 2,
  },

  backButton: {
    width: 42,
    height: 42,

    borderRadius: 14,

    backgroundColor:
      COLORS.lightGold,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,

    borderColor:
      COLORS.border,
  },

  headerTextContainer: {
    flex: 1,

    marginLeft: 14,
  },

  headerTitle: {
    fontSize: 19,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  headerSubtitle: {
    fontSize: 12,

    color:
      COLORS.textSecondary,

    marginTop: 2,
  },

  headerIcon: {
    width: 42,
    height: 42,

    borderRadius: 14,

    backgroundColor:
      COLORS.lightGold,

    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 20,

    paddingTop: 20,

    paddingBottom: 40,

    width: '100%',

    maxWidth: 700,

    alignSelf: 'center',
  },

  introCard: {
    flexDirection: 'row',

    backgroundColor:
      COLORS.lightGold,

    borderRadius: 18,

    padding: 16,

    borderWidth: 1,

    borderColor:
      '#F1E2B8',

    marginBottom: 18,
  },

  introIcon: {
    width: 44,
    height: 44,

    borderRadius: 14,

    backgroundColor:
      COLORS.card,

    alignItems: 'center',
    justifyContent: 'center',
  },

  introTextContainer: {
    flex: 1,

    marginLeft: 12,
  },

  introTitle: {
    fontSize: 15,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 4,
  },

  introDescription: {
    fontSize: 12,

    lineHeight: 18,

    color:
      COLORS.textSecondary,
  },

  templateCard: {
    backgroundColor:
      COLORS.card,

    borderRadius: 20,

    padding: 18,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    marginBottom: 18,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.03,

    shadowRadius: 6,

    elevation: 1,
  },

  templateHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 15,
  },

  templateIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor:
      COLORS.lightGold,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 11,
  },

  templateTitleContainer: {
    flex: 1,
  },

  templateTitle: {
    fontSize: 15,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  templateSubtitle: {
    fontSize: 11,

    color:
      COLORS.textSecondary,

    marginTop: 3,
  },

  templateButtons: {
    flexDirection: 'row',

    gap: 10,
  },

  templateButton: {
    flex: 1,

    minHeight: 65,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      '#FFFDF6',

    borderRadius: 14,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    paddingHorizontal: 12,
  },

  templateFileIcon: {
    width: 38,
    height: 38,

    borderRadius: 10,

    backgroundColor:
      COLORS.card,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  templateButtonText: {
    flex: 1,
  },

  templateFormat: {
    fontSize: 13,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  templateDownloadText: {
    fontSize: 10,

    color:
      COLORS.textSecondary,

    marginTop: 2,
  },

  uploadCard: {
    backgroundColor:
      COLORS.card,

    borderRadius: 22,

    padding: 20,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.04,

    shadowRadius: 8,

    elevation: 2,
  },

  sectionTitle: {
    fontSize: 17,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 5,
  },

  sectionDescription: {
    fontSize: 12,

    lineHeight: 18,

    color:
      COLORS.textSecondary,

    marginBottom: 18,
  },

  uploadBox: {
    minHeight: 210,

    borderWidth: 1.5,

    borderStyle: 'dashed',

    borderColor:
      COLORS.primary,

    borderRadius: 18,

    backgroundColor:
      COLORS.lightGold,

    justifyContent:
      'center',

    alignItems:
      'center',

    padding: 24,
  },

  uploadIconCircle: {
    width: 64,
    height: 64,

    borderRadius: 32,

    backgroundColor:
      COLORS.card,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,

    borderWidth: 1,

    borderColor:
      COLORS.border,
  },

  uploadText: {
    fontSize: 17,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  supportText: {
    marginTop: 7,

    fontSize: 12,

    color:
      COLORS.textSecondary,
  },

  fileCard: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 16,

    backgroundColor:
      '#FFFDF6',

    borderRadius: 14,

    padding: 12,

    borderWidth: 1,

    borderColor:
      COLORS.border,
  },

  fileIcon: {
    width: 42,
    height: 42,

    borderRadius: 11,

    backgroundColor:
      '#EAF5EA',

    alignItems: 'center',
    justifyContent: 'center',
  },

  fileInfo: {
    flex: 1,

    marginLeft: 10,
  },

  fileLabel: {
    fontSize: 10,

    color:
      COLORS.textSecondary,

    marginBottom: 3,

    textTransform:
      'uppercase',

    letterSpacing: 0.5,

    fontWeight: '700',
  },

  fileName: {
    color:
      COLORS.text,

    fontSize: 13,

    fontWeight: '700',
  },

  removeButton: {
    width: 34,
    height: 34,

    borderRadius: 10,

    backgroundColor:
      '#FFF0F0',

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 8,
  },

  infoCard: {
    flexDirection: 'row',

    backgroundColor:
      COLORS.card,

    borderRadius: 16,

    padding: 15,

    marginTop: 16,

    borderWidth: 1,

    borderColor:
      COLORS.border,
  },

  infoIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    backgroundColor:
      COLORS.lightGold,

    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,

    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 13,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 3,
  },

  infoText: {
    fontSize: 11,

    lineHeight: 17,

    color:
      COLORS.textSecondary,
  },

  importButton: {
    marginTop: 22,

    backgroundColor:
      COLORS.primary,

    borderRadius: 15,

    minHeight: 54,

    paddingHorizontal: 20,

    flexDirection: 'row',

    justifyContent:
      'center',

    alignItems: 'center',

    gap: 10,

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.18,

    shadowRadius: 6,

    elevation: 4,
  },

  disabledButton: {
    opacity: 0.55,
  },

  importButtonText: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',
  },

  cancelButton: {
    minHeight: 48,

    marginTop: 10,

    borderRadius: 14,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      'transparent',
  },

  cancelButtonText: {
    fontSize: 14,

    fontWeight: '700',

    color:
      COLORS.textSecondary,
  },
});