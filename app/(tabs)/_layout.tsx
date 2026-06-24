import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Platform,
} from 'react-native';
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

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { token } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

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

        tabBarStyle: { 
          height: 72,
          borderRadius: 24,
          backgroundColor: theme.card,
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 14 : 10,
          elevation: 8,
          shadowColor: '#DAA520', 
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: {
            width: 0,
            height: 6,
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

      {/* ORDERS TAB */}
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
      {/* BOOKINGS TAB */}
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

      {/* ANALYTICS TAB */}
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

      {/* PROFILE SCREEN (HIDDEN FROM BOTTOM TAB BAR) */}
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(218, 165, 32, 0.08)', 
  },
});