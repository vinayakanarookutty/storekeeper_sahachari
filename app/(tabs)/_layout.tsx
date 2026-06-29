import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ADD THIS

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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
      ]}
    >
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

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { token } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const insets = useSafeAreaInsets(); // ADD THIS

  const theme = {
    background: colorScheme === 'dark' ? '#121212' : '#FDFCF7',
    card: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#1A140B',
    inactive: colorScheme === 'dark' ? '#8E8E93' : '#A0AEC0',
    primary: '#DAA520',
    border: colorScheme === 'dark' ? '#2C2C2E' : '#E5E7EB',
  };

  useEffect(() => {
    if (!token) {
      router.replace('./login');
    }
  }, [token]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,

          // Dynamic height based on device safe area
          height: 60 + insets.bottom,

          paddingTop: 3,
          paddingBottom: Math.max(insets.bottom, 10),

          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,

          elevation: 12,
          shadowColor: '#DAA520',
          shadowOpacity: 0.08,
          shadowRadius: 9,
          shadowOffset: {
            width: 0,
            height: -4,
          },

          position: 'absolute', // important
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 1,
        },

        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.homeTab,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="three"
        options={{
          title: t.ordersTab,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="shopping-bag"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="calendar"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Analytics"
        options={{
          title: t.analyticsTab,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="bar-chart"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 80,
  },

  activeIconContainer: {
    backgroundColor: 'rgba(218,165,32,0.08)',
    
  },
});