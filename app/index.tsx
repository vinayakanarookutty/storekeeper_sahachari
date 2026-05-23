import { Redirect } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { styles } from './styles/index.style';
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
