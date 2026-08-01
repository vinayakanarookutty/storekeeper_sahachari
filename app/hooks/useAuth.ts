import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getMessaging, getToken } from "@react-native-firebase/messaging";

import { useAuth } from "../contexts/AuthContext";
import {
  getCurrentUser,
  loginApi,
  signupApi,
  removeFcmToken,
} from "../services/api";

// ======================================================
// Login
// ======================================================

export function useLogin() {
  const { setAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
    }) => {
      return await loginApi(credentials);
    },

    onSuccess: async data => {
      await setAuthToken(data.accessToken);

      try {
        const userData = await getCurrentUser();

        queryClient.setQueryData(
          ["currentUser"],
          userData,
        );
      } catch (error) {
        console.log(
          "Could not fetch user data:",
          error,
        );
      }

      router.replace("/(tabs)");
    },

    onError: (error: Error) => {
      console.error(
        "Login failed:",
        error,
      );

      throw error;
    },
  });
}

// ======================================================
// Signup
// ======================================================

export function useSignup() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: {
      name: string;
      email: string;
      password: string;
      address: string;
      serviceablePincodes: string[];
      role: string;
    }) => {
      return await signupApi(credentials);
    },

    onSuccess: async data => {
      console.log(
        "Signup response:",
        data,
      );

      router.replace("/login");
    },

    onError: (error: Error) => {
      console.error(
        "Signup failed:",
        error,
      );

      throw error;
    },
  });
}

// ======================================================
// Logout
// ======================================================

export function useLogout() {
  const { clearAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const token = await getToken(
          getMessaging(),
        );

        if (token) {
          await removeFcmToken(token);
        }
      } catch (error) {
        console.warn(
          "Failed to remove FCM token:",
          error,
        );
      }
    },

    onSuccess: async () => {
      await clearAuthToken();

      queryClient.clear();

      router.replace("/login");
    },

    onError: async error => {
      console.error(
        "Logout error:",
        error,
      );

      // Still log out locally
      await clearAuthToken();

      queryClient.clear();

      router.replace("/login");
    },
  });
}

// ======================================================
// Current User
// ======================================================

export function useCurrentUser() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["currentUser"],

    queryFn: getCurrentUser,

    enabled: !!token,

    staleTime: 10 * 60 * 1000,

    retry: 1,
  });
}