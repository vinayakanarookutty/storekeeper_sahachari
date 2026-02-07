import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './contexts/AuthContext';

export default function Index() {
  const { token, isLoading } = useAuth();

  console.log('🔍 Index route - isLoading:', isLoading, 'token exists:', !!token);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (token) {
    console.log('✅ User authenticated - redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }

  console.log('❌ User not authenticated - redirecting to login');
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
  },
});
