import { getToken } from "./auth";

// Get API URL from environment or use default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add authorization token if required
  if (requiresAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  console.log("API Request:", {
    url,
    method: restOptions.method || "GET",
    requiresAuth,
    hasToken: requiresAuth ? !!(await getToken()) : "N/A",
  });

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If response is not JSON, try to get text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (textError) {
        // Use default error message
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// Auth API calls
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
  // NOTE: category field removed - not required by API
}

// Login response - only contains accessToken
export interface LoginResponse {
  accessToken: string;
}

// Signup response
export interface SignupResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  message: string;
}

// User data structure (from /auth/me or other endpoints)
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  address?: string;
  serviceablePincodes?: string[];
}

export async function loginApi(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    requiresAuth: false, // No token needed
  });
}

export async function signupApi(
  credentials: SignupCredentials,
): Promise<SignupResponse> {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
    requiresAuth: false, // No token needed
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest("/auth/me", {
    method: "GET",
    requiresAuth: true, // Token required
  });
}

// Example: Other API calls that require authentication
export async function fetchUserProfile(userId: string): Promise<User> {
  return apiRequest(`/users/${userId}`, {
    method: "GET",
    requiresAuth: true, // Token required
  });
}

export async function updateUserProfile(
  userId: string,
  data: Partial<User>,
): Promise<User> {
  return apiRequest(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    requiresAuth: true, // Token required
  });
}

// Example: Fetch items (requires token)
export async function fetchItems(): Promise<any[]> {
  return apiRequest("/items", {
    method: "GET",
    requiresAuth: true, // Token required
  });
}

// Example: Create item (requires token)
export async function createItem(data: any): Promise<any> {
  return apiRequest("/items", {
    method: "POST",
    body: JSON.stringify(data),
    requiresAuth: true, // Token required
  });
}
