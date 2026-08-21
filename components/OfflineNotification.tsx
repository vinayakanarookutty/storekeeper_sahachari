import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import {
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react-native";

const API_URL =
  "https://d12kkdtchca0yi.cloudfront.net";

type NetworkStatus = "online" | "offline";

export default function OfflineNotification() {
  const insets = useSafeAreaInsets();

  const [status, setStatus] =
    useState<NetworkStatus | null>(null);

  const [checking, setChecking] =
    useState(false);

  const previousStatus =
    useRef<NetworkStatus | null>(null);

  const initialized =
    useRef(false);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY =
    useRef(new Animated.Value(-120)).current;

  const opacity =
    useRef(new Animated.Value(0)).current;

  // ==================================================
  // HIDE
  // ==================================================

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: Platform.OS !== "web",
      }),

      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => {
      setStatus(null);
    });
  }, [opacity, translateY]);

  // ==================================================
  // SHOW
  // ==================================================

  const showAlert = useCallback(
    (newStatus: NetworkStatus) => {
      console.log(
        "[OfflineNotification] SHOW:",
        newStatus
      );

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setStatus(newStatus);

      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: Platform.OS !== "web",
        }),

        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideAlert();
      }, 3000);
    },
    [hideAlert, opacity, translateY]
  );

  // ==================================================
  // CHECK ACTUAL INTERNET
  // ==================================================

  const checkConnection =
    useCallback(async (): Promise<boolean> => {
      try {
        // --------------------------------------------
        // FIRST: DEVICE/BROWSER NETWORK
        // --------------------------------------------

        if (Platform.OS === "web") {
          if (
            typeof navigator !== "undefined" &&
            !navigator.onLine
          ) {
            console.log(
              "[OfflineNotification] Browser offline"
            );

            return false;
          }
        } else {
          const netState =
            await NetInfo.fetch();

          if (
            netState.isConnected === false
          ) {
            console.log(
              "[OfflineNotification] Device offline"
            );

            return false;
          }
        }

        // --------------------------------------------
        // SECOND: ACTUAL API CHECK
        // --------------------------------------------

        const controller =
          new AbortController();

        const timeout = setTimeout(() => {
          controller.abort();
        }, 5000);

        try {
          const response = await fetch(
            `${API_URL}/`,
            {
              method: "GET",
              signal: controller.signal,
              cache: "no-store",
            }
          );

          clearTimeout(timeout);

          console.log(
            "[OfflineNotification] API status:",
            response.status
          );

          // Any HTTP response means network works.
          // Even 401/404 means internet is working.
          return true;
        } catch (error) {
          clearTimeout(timeout);

          console.log(
            "[OfflineNotification] API unreachable"
          );

          return false;
        }
      } catch (error) {
        console.log(
          "[OfflineNotification] Connection check error:",
          error
        );

        return false;
      }
    }, []);

  // ==================================================
  // PROCESS STATUS
  // ==================================================

  const processStatus = useCallback(
    (online: boolean) => {
      const newStatus: NetworkStatus =
        online ? "online" : "offline";

      console.log(
        "[OfflineNotification] STATUS:",
        newStatus
      );

      // --------------------------------------------
      // FIRST CHECK
      // --------------------------------------------

      if (!initialized.current) {
        initialized.current = true;

        previousStatus.current =
          newStatus;

        // Show initial status
        showAlert(newStatus);

        return;
      }

      // --------------------------------------------
      // STATUS CHANGED
      // --------------------------------------------

      if (
        previousStatus.current !==
        newStatus
      ) {
        previousStatus.current =
          newStatus;

        showAlert(newStatus);
      }
    },
    [showAlert]
  );

  // ==================================================
  // INITIAL CHECK
  // ==================================================

  useEffect(() => {
    let mounted = true;

    const initialCheck = async () => {
      const online =
        await checkConnection();

      if (!mounted) return;

      processStatus(online);
    };

    initialCheck();

    return () => {
      mounted = false;
    };
  }, [
    checkConnection,
    processStatus,
  ]);

  // ==================================================
  // CONTINUOUS MONITOR
  // ==================================================

  useEffect(() => {
    let mounted = true;

    let interval:
      | ReturnType<typeof setInterval>
      | null = null;

    const check = async () => {
      if (!mounted) return;

      const online =
        await checkConnection();

      if (!mounted) return;

      processStatus(online);
    };

    // Check every 5 seconds
    interval = setInterval(
      check,
      5000
    );

    // --------------------------------------------
    // WEB EVENTS
    // --------------------------------------------

    const handleOnline = () => {
      console.log(
        "[OfflineNotification] Browser ONLINE"
      );

      check();
    };

    const handleOffline = () => {
      console.log(
        "[OfflineNotification] Browser OFFLINE"
      );

      processStatus(false);
    };

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.addEventListener(
        "online",
        handleOnline
      );

      window.addEventListener(
        "offline",
        handleOffline
      );
    }

    // --------------------------------------------
    // MOBILE NETINFO
    // --------------------------------------------

    const unsubscribe =
      NetInfo.addEventListener(
        async (state) => {
          if (!mounted) return;

          if (
            state.isConnected === false
          ) {
            processStatus(false);
            return;
          }

          // Verify actual connection
          const online =
            await checkConnection();

          if (!mounted) return;

          processStatus(online);
        }
      );

    return () => {
      mounted = false;

      if (interval) {
        clearInterval(interval);
      }

      unsubscribe();

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.removeEventListener(
          "online",
          handleOnline
        );

        window.removeEventListener(
          "offline",
          handleOffline
        );
      }

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, [
    checkConnection,
    processStatus,
  ]);

  // ==================================================
  // RETRY
  // ==================================================

  const handleRetry = async () => {
    if (checking) return;

    setChecking(true);

    try {
      const online =
        await checkConnection();

      processStatus(online);
    } catch (error) {
      console.log(
        "[OfflineNotification] Retry error:",
        error
      );
    } finally {
      setTimeout(() => {
        setChecking(false);
      }, 500);
    }
  };

  // ==================================================
  // NOTHING TO DISPLAY
  // ==================================================

  if (!status) {
    return null;
  }

  const isOnline =
    status === "online";

  const topPosition =
    Platform.OS === "ios"
      ? Math.max(insets.top, 20)
      : Math.max(
          insets.top + 8,
          16
        );

  // ==================================================
  // UI
  // ==================================================

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: topPosition,

          transform: [
            {
              translateY,
            },
          ],

          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.alert,
          isOnline
            ? styles.online
            : styles.offline,
        ]}
      >
        {/* ICON */}

        <View style={styles.icon}>
          {isOnline ? (
            <Wifi
              size={22}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          ) : (
            <WifiOff
              size={22}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          )}
        </View>

        {/* TEXT */}

        <View style={styles.content}>
          <Text style={styles.title}>
            {isOnline
              ? "Internet Connected"
              : "No Internet Connection"}
          </Text>

          <Text style={styles.message}>
            {isOnline
              ? "Your internet connection is active"
              : "Please check your internet connection"}
          </Text>
        </View>

        {/* RETRY */}

        {!isOnline && (
          <Pressable
            onPress={handleRetry}
            disabled={checking}
            style={({ pressed }) => [
              styles.retry,
              {
                opacity: pressed
                  ? 0.7
                  : 1,
              },
            ]}
          >
            {checking ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <RefreshCw
                  size={14}
                  color="#FFFFFF"
                  style={{
                    marginRight: 5,
                  }}
                />

                <Text
                  style={styles.retryText}
                >
                  Retry
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999999,
    elevation: 999999,
  },

  alert: {
    minHeight: 66,

    borderRadius: 16,

    paddingVertical: 11,
    paddingHorizontal: 14,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.25,
    shadowRadius: 10,

    elevation: 10,
  },

  online: {
    backgroundColor: "#059669",
    borderColor: "#047857",
    shadowColor: "#059669",
  },

  offline: {
    backgroundColor: "#DC2626",
    borderColor: "#B91C1C",
    shadowColor: "#DC2626",
  },

  icon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor:
      "rgba(255,255,255,0.20)",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 11,
  },

  content: {
    flex: 1,
    marginRight: 8,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  message: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11.5,
    marginTop: 2,
  },

  retry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    minWidth: 68,

    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 9,

    backgroundColor:
      "rgba(255,255,255,0.20)",

    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.3)",
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});