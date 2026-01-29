import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native/Libraries/Alert/Alert';
import { getToken, removeToken, saveToken } from '../services/auth';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  setAuthToken: (token: string) => Promise<void>;
  clearAuthToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getToken();
        setToken(storedToken);
      } catch (error) {
        console.error('Failed to load token:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Store token
  const setAuthToken = async (newToken: string) => {
    await saveToken(newToken);
    setToken(newToken);
  };

  // Clear token
// AuthContext.tsx
const clearAuthToken = async () => {
    Alert.alert('Debug', 'clearAuthToken called');
    await removeToken();
    setToken(null);
    Alert.alert('Debug', 'Token set to null');
};
  const value: AuthContextType = {
    token,
    isLoading,
    setAuthToken,
    clearAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};