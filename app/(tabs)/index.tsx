import { Text, View } from '@/components/Themed';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/api';

export default function TabOneScreen() {
  const { token } = useAuth();

  // Example: Fetch user data (replace with your actual endpoint)
  const { data: userData, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiRequest('/auth/me'),
    enabled: !!token,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome! 👋</Text>
      
      {isLoading ? (
        <Text style={styles.subtitle}>Loading...</Text>
      ) : userData ? (
        <View style={styles.userCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userData.name || 'User'}</Text>
          
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userData.email || 'user@example.com'}</Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>You're logged in!</Text>
      )}

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This is your home screen. Use the logout button in the top right to sign out.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  userCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFF9E6',
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});