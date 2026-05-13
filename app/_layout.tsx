import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { styles } from './styles/_layout.style';import { AuthProvider } from './contexts/AuthContext';

// Prevent auto-hide so we control the timing
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for 3 seconds (splash screen display time)
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide splash screen only when BOTH fonts are loaded AND timer is complete
  useEffect(() => {
    if (error) throw error;
    
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady, error]);

  // Keep showing splash screen until both conditions are met
  if (!loaded || !isReady) {
    // Show custom splash for web development testing
    if (Platform.OS === 'web') {
      return (
        <View style={styles.splashContainer}>
          <Image
            source={require('../assets/images/splashscreen.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
        </View>
      );
    }
    return null;
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Initial index route - handles auth routing */}
        <Stack.Screen name="index" />
        
        {/* Auth screens */}
        <Stack.Screen name="signup" />
        <Stack.Screen name="login" />
        
        {/* Main app */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        
        {/* Product screens */}
        <Stack.Screen 
          name="add-product" 
          options={{ 
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="edit-product" 
          options={{ 
            presentation: 'modal',
          }} 
        />
        <Stack.Screen name="product-detail" />
      </Stack>
    </ThemeProvider>
  );
}