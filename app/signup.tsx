import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
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
  const [pincodes, setPincodes] = useState(''); // Comma-separated pincodes

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      return apiRequest<SignupResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: false,
      });
    },
    onSuccess: async (response) => {
      console.log('Signup response:', response);
      
      // Show success message
    Alert.alert(
      'Account Created',
      'Registration successful! Please log in.',
      [{ 
        text: 'OK', 
        onPress: () => {
          // Use absolute path to ensure expo-router finds it
          router.replace('/login'); 
        } 
      }],
      { cancelable: false }
    );
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message || 'Please try again');
    },
  });

  const handleSignup = () => {
    // Validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password)');
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

    // Parse pincodes
    const serviceablePincodes = pincodes
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    // Call signup mutation
    signupMutation.mutate({
      name,
      email,
      password,
      address: address || '',
      serviceablePincodes,
      role: 'ADMIN', // Default role
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

            <TextInput
              style={styles.input}
              placeholder="Password *"
              placeholderTextColor="#A89378"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!signupMutation.isPending}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              placeholderTextColor="#A89378"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!signupMutation.isPending}
            />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2D2416',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    color: '#2D2416',
  },
  textArea: {
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: '#A89378',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#DAA520',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#DAA520',
    fontSize: 14,
    fontWeight: '600',
  },
});