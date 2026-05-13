import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { styles } from './styles/signup.style';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome'; // Import for the eye icon
import { apiRequest } from './services/api';

interface SignupData {
  name: string;
  email: string;
  password: string;
  address: string;
  serviceablePincodes: string[];
  role: string;
}

interface SignupResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  message: string;
}

export default function SignupScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [pincodes, setPincodes] = useState(''); 

  // States for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      return apiRequest<SignupResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: false,
      });
    },
    onSuccess: async (response) => {
      Alert.alert(
        'Account Created',
        'Registration successful! Please log in.',
        [{ 
          text: 'OK', 
          onPress: () => {
            router.replace('/login'); 
          } 
        }],
        { cancelable: false }
      );
    },
    onError: (error: any) => {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    },
  });

  const handleSignup = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const serviceablePincodes = pincodes
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    signupMutation.mutate({
      name,
      email,
      password,
      address: address || '',
      serviceablePincodes,
      role: 'ADMIN', 
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Name *"
              placeholderTextColor="#A89378"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!signupMutation.isPending}
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#A89378"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!signupMutation.isPending}
            />

            {/* Password Field */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password *"
                placeholderTextColor="#A89378"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!signupMutation.isPending}
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

            {/* Confirm Password Field */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password *"
                placeholderTextColor="#A89378"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!signupMutation.isPending}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <FontAwesome 
                  name={showConfirmPassword ? "eye" : "eye-slash"} 
                  size={20} 
                  color="#A89378" 
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Shop Address"
              placeholderTextColor="#A89378"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!signupMutation.isPending}
            />

            <TextInput
              style={styles.input}
              placeholder="Serviceable Pincodes (comma-separated)"
              placeholderTextColor="#A89378"
              value={pincodes}
              onChangeText={setPincodes}
              keyboardType="numeric"
              editable={!signupMutation.isPending}
            />
            <Text style={styles.helperText}>
              Example: 688524, 688539
            </Text>

            <TouchableOpacity
              style={[styles.button, signupMutation.isPending && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                disabled={signupMutation.isPending}
              >
                <Text style={styles.linkText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}