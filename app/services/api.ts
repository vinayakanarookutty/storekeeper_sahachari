import { getToken } from "./auth";

/**
 * CONFIGURATION
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * INTERFACES & TYPES
 */
interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  address: string;
  serviceablePincodes: string[];
  role: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface SignupResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  address?: string;
  serviceablePincodes?: string[];
}

/**
 * CORE API WRAPPWER
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  // Initialize headers with standard JSON content type
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  let token: string | null = null;

  // Handle Authentication logic
  if (requiresAuth) {
    token = await getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Log request for debugging (Optimized to use existing variables)
  console.log(`[API ${restOptions.method || "GET"}]`, url, {
    auth: requiresAuth,
    hasToken: !!token,
  });

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
    } catch (e) {
      // Keep default message if parsing fails
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * EXPORTED API FUNCTIONS
 */

// --- Auth Endpoints ---

export async function loginApi(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    requiresAuth: false,
  });
}

export async function signupApi(credentials: SignupCredentials): Promise<SignupResponse> {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
    requiresAuth: false,
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest("/auth/me", {
    method: "GET",
    requiresAuth: true,
  });
}

// --- User Profile Endpoints ---

export async function fetchUserProfile(userId: string): Promise<User> {
  return apiRequest(`/users/${userId}`, {
    method: "GET",
    requiresAuth: true,
  });
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
  return apiRequest(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    requiresAuth: true,
  });
}

// --- Product/Item Endpoints ---

export async function fetchItems(): Promise<any[]> {
  return apiRequest("/items", {
    method: "GET",
    requiresAuth: true,
  });
}

export async function createItem(data: any): Promise<any> {
  return apiRequest("/items", {
    method: "POST",
    body: JSON.stringify(data),
    requiresAuth: true,
  });
}