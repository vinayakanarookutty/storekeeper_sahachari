import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import {
  getCurrentUser,
  getCurrentUserWithToken,
  decodeJwtRole,
  loginApi,
  signupApi,
  User,
} from "../services/api";

// Login mutation
export function useLogin() {
  const { setAuthToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const data = await loginApi(credentials);
      if (!data?.accessToken) {
        throw new Error("Invalid response from login server");
      }

      // Check JWT payload role
      const jwtRole = decodeJwtRole(data.accessToken);
      if (jwtRole && jwtRole.toUpperCase() !== "ADMIN") {
        throw new Error("Access restricted. Only users with the ADMIN role can use the Storekeeper portal.");
      }

      // Check fresh backend profile
      let userData: User | null = null;
      try {
        userData = await getCurrentUserWithToken(data.accessToken);
      } catch (err) {
        console.warn("Could not fetch user profile with token:", err);
      }

      if (userData) {
        const userRole = (userData.role || "").toUpperCase();
        if (userRole !== "ADMIN") {
          throw new Error("Access restricted. Only users with the ADMIN role can use the Storekeeper portal.");
        }
      } else if (!jwtRole) {
        throw new Error("Could not verify administrator privileges.");
      }

      return {
        accessToken: data.accessToken,
        user: userData,
      };
    },
    onSuccess: async (data) => {
      await setAuthToken(data.accessToken, data.user);
      if (data.user) {
        queryClient.setQueryData(["currentUser"], data.user);
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

      // Navigate to login
      router.replace("/login");
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
