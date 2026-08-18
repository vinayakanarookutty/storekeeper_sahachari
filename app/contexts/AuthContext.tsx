// app/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, removeToken, saveToken, getUser, saveUser, removeUser } from '../services/auth';
import { getCurrentUser, decodeJwtRole, User } from '../services/api';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuthToken: (token: string, userData?: User | null) => Promise<void>;
  setUserProfile: (userData: User | null) => Promise<void>;
  clearAuthToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and validate ADMIN role on mount
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        console.log('AuthContext: Loading stored session...');
        const storedToken = await getToken();
        const storedUser = await getUser();

        if (!storedToken) {
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
          return;
        }

        // Check JWT token role first
        const jwtRole = decodeJwtRole(storedToken);
        if (jwtRole && jwtRole.toUpperCase() !== 'ADMIN') {
          console.warn(`AuthContext: Stored token role is ${jwtRole} (not ADMIN). Purging session.`);
          await removeToken();
          await removeUser();
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
          return;
        }

        // If cached user exists and is NOT ADMIN, invalidate immediately
        if (storedUser && storedUser.role?.toUpperCase() !== 'ADMIN') {
          console.warn('AuthContext: Cached user is not ADMIN. Purging session.');
          await removeToken();
          await removeUser();
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
          return;
        }

        // If verified as ADMIN from JWT or cache
        if (storedUser && storedUser.role?.toUpperCase() === 'ADMIN') {
          if (isMounted) {
            setToken(storedToken);
            setUser(storedUser);
          }
        }

        // Validate fresh profile with backend
        try {
          const freshUser = await getCurrentUser();
          if (freshUser) {
            if (freshUser.role?.toUpperCase() !== 'ADMIN') {
              console.warn('AuthContext: Fresh user is not ADMIN. Purging session.');
              await removeToken();
              await removeUser();
              if (isMounted) {
                setToken(null);
                setUser(null);
              }
              return;
            }
            await saveUser(freshUser);
            if (isMounted) {
              setToken(storedToken);
              setUser(freshUser);
            }
          }
        } catch (apiErr) {
          console.log('AuthContext: Backend verification skipped (offline or network error):', apiErr);
          if (jwtRole?.toUpperCase() === 'ADMIN') {
            if (isMounted) setToken(storedToken);
          } else if (!storedUser) {
            // Cannot verify role while offline and without cached profile
            await removeToken();
            await removeUser();
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('AuthContext: Failed to load session:', error);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('AuthContext: Loading complete');
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Store token and user
  const setAuthToken = async (newToken: string, userData?: User | null) => {
    try {
      console.log('AuthContext: Saving verified ADMIN token and session...');
      await saveToken(newToken);
      setToken(newToken);

      if (userData) {
        await saveUser(userData);
        setUser(userData);
      }
      console.log('AuthContext: Token saved successfully');
    } catch (error) {
      console.error('AuthContext: Failed to save token:', error);
      throw error;
    }
  };

  const setUserProfile = async (userData: User | null) => {
    try {
      if (userData) {
        await saveUser(userData);
        setUser(userData);
      } else {
        await removeUser();
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Failed to save user profile:', error);
    }
  };

  // Clear token
  const clearAuthToken = async () => {
    try {
      console.log('AuthContext: Clearing session...');
      await removeToken();
      await removeUser();
      setToken(null);
      setUser(null);
      console.log('AuthContext: Session cleared successfully');
    } catch (error) {
      console.error('AuthContext: Failed to clear session:', error);
      throw error;
    }
  };

  const jwtRole = token ? decodeJwtRole(token) : null;
  const isRoleAdmin =
    user?.role?.toUpperCase() === 'ADMIN' ||
    jwtRole?.toUpperCase() === 'ADMIN';

  const isAuthenticated = !!token && isRoleAdmin;

  const value: AuthContextType = {
    token,
    user,
    isLoading,
    isAuthenticated,
    isAdmin: isRoleAdmin,
    setAuthToken,
    setUserProfile,
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