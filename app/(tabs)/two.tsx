import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/api';

export default function TabTwoScreen() {
  const { token, clearAuthToken } = useAuth();
  const router = useRouter();
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;    // Optional, depending on your backend
  avatar?: string;  // Optional
}
  // Example: Fetch user data
  const { data: userData, isLoading } = useQuery<UserProfile, Error>({
    queryKey: ['currentUser'],
    queryFn: () => apiRequest('/auth/me'),
    enabled: !!token,
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuthToken();
            router.replace('/signup');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FontAwesome name="user-circle" size={80} color="#FDB515" />
          <Text style={styles.title}>Profile</Text>
        </View>

        {isLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : userData ? (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <FontAwesome name="user" size={20} color="#666" style={styles.icon} />
              <View style={styles.infoContent}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{userData.name || 'User'}</Text>
              </View>
            </View>

            <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

            <View style={styles.infoRow}>
              <FontAwesome name="envelope" size={20} color="#666" style={styles.icon} />
              <View style={styles.infoContent}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{userData.email || 'user@example.com'}</Text>
              </View>
            </View>

            <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

            <View style={styles.infoRow}>
              <FontAwesome name="id-badge" size={20} color="#666" style={styles.icon} />
              <View style={styles.infoContent}>
                <Text style={styles.label}>User ID</Text>
                <Text style={styles.value}>{userData.id || 'N/A'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.noDataText}>No user data available</Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <FontAwesome name="edit" size={20} color="#FDB515" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <FontAwesome name="cog" size={20} color="#FDB515" />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <FontAwesome name="question-circle" size={20} color="#FDB515" />
            <Text style={styles.actionButtonText}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  section: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  separator: {
    marginVertical: 16,
    height: 1,
    width: '100%',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});