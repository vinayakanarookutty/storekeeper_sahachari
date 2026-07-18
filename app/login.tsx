// D:\storekeeper_sahachari\app\login.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext'; // Imported context hook
import { getCurrentUser, loginApi } from './services/api';
import { styles } from './styles/login.style';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage(); // Extract language properties
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const loginResponse = await loginApi(credentials);
      return loginResponse;
    },
    onSuccess: async (data) => {
      await setAuthToken(data.accessToken);
      try {
        const userData = await getCurrentUser();
        queryClient.setQueryData(['currentUser'], userData);
      } catch (error) {
        console.log('Could not fetch user data:', error);
      }
      router.replace('/');
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Login Failed', error.message || 'Invalid email or password');
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      showAlert(t.errorTitle || 'Error', t.fillFieldsMsg || 'Please fill in all fields');
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ml' : 'en';
    setLanguage(nextLang);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Dynamic Language Selection Toggle Action Bar */}
      <View style={{ width: '100%', alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 16 }}>
        <TouchableOpacity 
          onPress={toggleLanguage} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#F4EFE6', 
            paddingVertical: 6, 
            paddingHorizontal: 14, 
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#E6DCCD'
          }}
        >
          <FontAwesome name="globe" size={15} color="#A89378" style={{ marginRight: 6 }} />
          <Text style={{ color: '#2D2416', fontWeight: '600', fontSize: 13 }}>
            {language === 'en' ? 'മലയാളം' : 'English'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t.welcomeBack}</Text>
          <Text style={styles.subtitle}>{t.loginSubtitle}</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              placeholderTextColor="#A89378"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loginMutation.isPending}
            />

            {/* Password Input Container */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor="#A89378"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loginMutation.isPending}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome 
                  name={showPassword ? "eye" : "eye-slash"} 
                  size={20} 
                  color="#A89378" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t.logInLabel}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/forgot-password' as any)}
            >
              <Text style={styles.forgotPasswordText}>
                {t.forgotPasswordLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}