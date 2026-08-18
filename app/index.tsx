import { Redirect } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { styles } from './styles/index.style';
export default function Index() {
  const { token, user, isLoading, isAuthenticated } = useAuth();

  console.log('🔍 Index route - isLoading:', isLoading, 'authenticated:', isAuthenticated, 'user role:', user?.role);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAA520" />
      </View>
    );
  }

  // Redirect based on authentication and ADMIN role status
  if (isAuthenticated && token) {
    console.log('✅ User authenticated as ADMIN - redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }

  console.log('❌ User not authenticated or not ADMIN - redirecting to login');
  return <Redirect href="/login" />;
}
