import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentUser, loginApi, signupApi } from "../services/api";

// Login mutation
export function useLogin() {
  const { setAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await loginApi(credentials);
      return response;
    },
    onSuccess: async (data) => {
      // Save the accessToken
      await setAuthToken(data.accessToken);

      // Try to fetch and cache user data
      try {
        const userData = await getCurrentUser();
        queryClient.setQueryData(["currentUser"], userData);
      } catch (error) {
        console.log("Could not fetch user data:", error);
      }

      // Navigate to tabs
      router.replace("/(tabs)");
    },
    onError: (error: Error) => {
      console.error("Login failed:", error);
      throw error;
    },
  });
}

// Signup mutation
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
    onSuccess: async (data) => {
      console.log("Signup response:", data);
      // Don't auto-login, redirect to login page
      router.replace("/login");
    },
    onError: (error: Error) => {
      console.error("Signup failed:", error);
      throw error;
    },
  });
}

// Logout mutation
export function useLogout() {
  const { clearAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // If you have a logout endpoint, call it here
      // await apiRequest('/auth/logout', { method: 'POST' });
    },
    onSuccess: async () => {
      // Clear token
      await clearAuthToken();

      // Clear all cached data
      queryClient.clear();

      // Navigate to signup
      router.replace("/signup");
    },
  });
}

// Get current user query - requires token
export function useCurrentUser() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    enabled: !!token, // Only run if token exists
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once on failure
  });
}
