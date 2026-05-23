import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Custom Tab Icon Component
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused?: boolean;
}) {
  return (
    <View
      style={[
        styles.iconContainer,
        props.focused && styles.activeIconContainer,
      ]}>
      <FontAwesome
        size={22}
        {...props}
        style={{
          opacity: props.focused ? 1 : 0.8,
        }}
      />
    </View>
  );
}

const showLogoutConfirmation = (onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm('Logout\n\nAre you sure you want to logout?');
    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: onConfirm },
      ]
    );
  }
};

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { token, clearAuthToken } = useAuth();
  const router = useRouter();

  // Theme colors
  const theme = {
    background: colorScheme === 'dark' ? '#121212' : '#F4F6F8',
    card: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
    inactive: colorScheme === 'dark' ? '#8E8E93' : '#7A7A7A',
    primary: '#DAA520', // <-- Removed the extra space here
    border: colorScheme === 'dark' ? '#2C2C2E' : '#E5E7EB',
  };

  // Redirect if user not logged in
  useEffect(() => {
    if (!token) {
      router.replace('./login');
    }
  }, [token]);

  // Logout function
  // Find your existing handleLogout function and update it to this:
  const handleLogout = () => {
    showLogoutConfirmation(async () => {
      await clearAuthToken();
      router.replace('/login');
    });
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),

        // HEADER STYLE
        headerStyle: {
          backgroundColor: theme.card,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },

        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: theme.text,
        },

        headerTintColor: theme.text,

        // TAB BAR STYLE
        tabBarStyle: {
          position: 'absolute',
          bottom: 1,
          left: 15,
          right: 15,
          height: 72,
          borderRadius: 22,
          backgroundColor: theme.card,
          borderTopWidth: 0,

          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,

          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 4,
          },
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },

        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
      }}>

      {/* HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="home"
              color={color}
              focused={focused}
            />
          ),

          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                {
                  backgroundColor: pressed
                    ? '#E5E7EB'
                    : theme.background,
                },
              ]}>
              <FontAwesome
                name="sign-out"
                size={18}
                color="#EF4444"
              />
            </Pressable>
          ),
        }}
      />

      {/* ORDERS TAB */}
      <Tabs.Screen
        name="three"
        options={{
          title: 'Orders',

          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="shopping-bag"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* PROFILE TAB */}
      <Tabs.Screen
        name="two"
        options={{
          title: 'Profile',

          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="user"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },

  activeIconContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },

  logoutButton: {
    marginRight: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});