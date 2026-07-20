import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation } from '@tanstack/react-query';
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
import { useLanguage } from './contexts/LanguageContext';
import { forgotPasswordApi, resetPasswordApi } from './services/api';
import { styles } from './styles/login.style';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (emailVal: string) => {
      return forgotPasswordApi(emailVal);
    },
    onSuccess: () => {
      showAlert(t.successTitle || 'Success', t.otpSentSuccess || 'OTP has been sent to your email successfully');
      setStep(2);
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Error', error.message || 'Failed to send OTP. Please check your email and try again.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { emailVal: string; otpVal: string; newPass: string }) => {
      return resetPasswordApi(payload.emailVal, payload.otpVal, payload.newPass);
    },
    onSuccess: () => {
      showAlert(t.successTitle || 'Success', t.passwordResetSuccess || 'Password reset successfully!');
      router.replace('/login');
    },
    onError: (error: any) => {
      showAlert(t.failedTitle || 'Error', error.message || 'Failed to reset password. Please check your OTP and try again.');
    },
  });

  const handleSendOtp = () => {
    if (!email.trim()) {
      showAlert(t.errorTitle || 'Error', t.fillFieldsMsg || 'Please fill in all fields');
      return;
    }
    forgotPasswordMutation.mutate(email.trim());
  };

  const handleResetPassword = () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showAlert(t.errorTitle || 'Error', t.fillFieldsMsg || 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(t.errorTitle || 'Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showAlert(t.errorTitle || 'Error', 'Password must be at least 6 characters long');
      return;
    }
    resetPasswordMutation.mutate({
      emailVal: email.trim(),
      otpVal: otp.trim(),
      newPass: newPassword,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 20, left: 24, zIndex: 10, padding: 10 }}
            onPress={() => {
              if (step === 2) {
                setStep(1);
              } else {
                router.back();
              }
            }}
          >
            <FontAwesome name="arrow-left" size={20} color="#2D2416" />
          </TouchableOpacity>

          <Text style={[styles.title, { marginTop: 40 }]}>
            {step === 1 ? (t.forgotPasswordTitle || 'Forgot Password') : 'Enter Reset Details'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 ? (t.enterEmailSubtitle || 'Enter your email to receive an OTP') : `We sent a 6-digit code to ${email}`}
          </Text>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor="#A89378"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!forgotPasswordMutation.isPending}
                />

                <TouchableOpacity
                  style={[styles.button, forgotPasswordMutation.isPending && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>{t.sendOtpBtn || 'Send OTP'}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t.otpPlaceholder || 'OTP (6-digit)'}
                  placeholderTextColor="#A89378"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!resetPasswordMutation.isPending}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t.newPasswordPlaceholder || 'New Password'}
                    placeholderTextColor="#A89378"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    editable={!resetPasswordMutation.isPending}
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

                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#A89378"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!resetPasswordMutation.isPending}
                />

                <TouchableOpacity
                  style={[styles.button, resetPasswordMutation.isPending && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>{t.resetPasswordBtn || 'Reset Password'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.replace('/login')}
              disabled={forgotPasswordMutation.isPending || resetPasswordMutation.isPending}
            >
              <Text style={styles.forgotPasswordText}>
                {t.backToLogin || 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
