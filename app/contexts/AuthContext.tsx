// app/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, removeToken, saveToken } from '../services/auth';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuthToken: (token: string) => Promise<void>;
  clearAuthToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token on mount
  useEffect(() => {
    let isMounted = true;

    const loadToken = async () => {
      try {
        console.log('AuthContext: Loading token from AsyncStorage...');
        const storedToken = await getToken();
        
        if (isMounted) {
          if (storedToken) {
            console.log('AuthContext: Token found in storage');
            setToken(storedToken);
          } else {
            console.log('AuthContext: No token found in storage');
            setToken(null);
          }
        }
      } catch (error) {
        console.error('AuthContext: Failed to load token:', error);
        if (isMounted) {
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('AuthContext: Loading complete');
        }
      }
    };

    loadToken();

    return () => {
      isMounted = false;
    };
  }, []);

  // Store token
  const setAuthToken = async (newToken: string) => {
    try {
      console.log('AuthContext: Saving new token...');
      await saveToken(newToken);
      setToken(newToken);
      console.log('AuthContext: Token saved successfully');
    } catch (error) {
      console.error('AuthContext: Failed to save token:', error);
      throw error;
    }
  };

  // Clear token
  const clearAuthToken = async () => {
    try {
      console.log('AuthContext: Clearing token...');
      await removeToken();
      setToken(null);
      console.log('AuthContext: Token cleared successfully');
    } catch (error) {
      console.error('AuthContext: Failed to clear token:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    token,
    isLoading,
    isAuthenticated: !!token,
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