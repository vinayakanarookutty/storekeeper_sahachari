import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { WifiOff, Wifi, RefreshCw, X, AlertCircle } from 'lucide-react-native';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function OfflineNotification() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const prevIsOfflineRef = useRef<boolean | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;

  // Send a system / in-app notification for offline / online state
  const notifyNetworkChange = async (offline: boolean) => {
    try {
      const title = offline
        ? (t.noInternet || 'No Internet Connection ⚠️')
        : (t.backOnline || 'Back Online ✅');
      const body = offline
        ? (t.noInternetDesc || 'You are currently offline. Please check your internet connection.')
        : (t.backOnlineDesc || 'Your internet connection has been restored.');

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      } else {
        // Haptic feedback
        try {
          Vibration.vibrate(offline ? [0, 200, 100, 200] : 150);
        } catch {
          // ignore vibration failure
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'network_status', isOffline: offline },
          },
          trigger: null, // immediate
        });
      }
    } catch (e) {
      console.warn('OfflineNotification: Failed to schedule local notification:', e);
    }
  };

  const handleStateChange = (state: NetInfoState) => {
    // Determine offline status:
    // If isConnected is explicitly false OR isInternetReachable is explicitly false
    const currentlyOffline =
      state.isConnected === false || state.isInternetReachable === false;

    if (prevIsOfflineRef.current === null) {
      // Initial check on mount
      prevIsOfflineRef.current = currentlyOffline;
      setIsOffline(currentlyOffline);
      if (currentlyOffline) {
        setIsDismissed(false);
        animateIn();
      }
      return;
    }

    if (prevIsOfflineRef.current !== currentlyOffline) {
      if (currentlyOffline) {
        // Went offline
        setIsOffline(true);
        setShowRestored(false);
        setIsDismissed(false);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        animateIn();
        notifyNetworkChange(true);
      } else {
        // Came back online
        setIsOffline(false);
        setShowRestored(true);
        setIsDismissed(false);
        animateIn();
        notifyNetworkChange(false);

        // Auto dismiss green restored banner after 3.5 seconds
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          animateOut(() => {
            setShowRestored(false);
          });
        }, 3500);
      }
      prevIsOfflineRef.current = currentlyOffline;
    }
  };

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      handleStateChange(state);
    });

    // Event listener
    const unsubscribe = NetInfo.addEventListener((state) => {
      handleStateChange(state);
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const animateIn = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  };

  const animateOut = (onComplete?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(onComplete);
  };

  const handleManualRetry = async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.refresh();
      handleStateChange(state);
    } catch (e) {
      console.warn('Network refresh error:', e);
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 500);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    animateOut();
  };

  if ((!isOffline && !showRestored) || isDismissed) {
    return null;
  }

  const isRestored = showRestored && !isOffline;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingTop: Math.max(insets.top, 12) + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          isRestored ? styles.containerOnline : styles.containerOffline,
        ]}
      >
        {/* Left Status Icon */}
        <View
          style={[
            styles.iconContainer,
            isRestored ? styles.iconContainerOnline : styles.iconContainerOffline,
          ]}
        >
          {isRestored ? (
            <Wifi size={20} color="#FFFFFF" />
          ) : (
            <WifiOff size={20} color="#FFFFFF" />
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {isRestored
              ? (t.backOnline || 'Back Online')
              : (t.noInternet || 'No Internet Connection')}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={2}>
            {isRestored
              ? (t.backOnlineDesc || 'Internet connection restored.')
              : (t.noInternetDesc || 'Please check your connection.')}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isRestored && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleManualRetry}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <RefreshCw size={13} color="#DC2626" style={styles.retryIcon} />
                  <Text style={styles.retryText}>{t.retry || 'Retry'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  containerOffline: {
    backgroundColor: '#DC2626', // Vibrant crimson red
    borderWidth: 1,
    borderColor: '#B91C1C',
  },
  containerOnline: {
    backgroundColor: '#059669', // Vibrant emerald green
    borderWidth: 1,
    borderColor: '#047857',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainerOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  retryIcon: {
    marginRight: 4,
  },
  retryText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
