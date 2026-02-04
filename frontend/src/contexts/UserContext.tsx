import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/api';
import { sanitize } from '@/helper/sanitize';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'superadmin';
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { username?: string; password?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getRedirectPath = (role: 'user' | 'admin' | 'superadmin') => {
    switch (role) {
      case 'superadmin':
        return '/superadmin';
      case 'admin':
        return '/admin';
      case 'user':
      default:
        return '/';
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      const userData = response.data;
      const userRole = userData.aud as 'user' | 'admin' | 'superadmin';
      setUser({
        id: userData.id,
        email: sanitize(userData.email),
        username: sanitize(userData.username),
        role: userRole,
      });

      // Redirect based on role if user is already logged in
      const redirectPath = getRedirectPath(userRole);
      if (window.location.pathname !== redirectPath) {
        navigate(redirectPath);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      await authApi.login({ email, password });
      await refreshUser(); // Fetch user data after login and redirect
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call the logout API to invalidate the token on the server
      await authApi.logout();

      // Clear any local storage or session storage
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.clear();
      } catch (e) {
        // Ignore storage errors
        console.warn("Failed to clear local storage:", e);
      }

      // Clear cookies by setting them to expire
      try {
        document.cookie = "csrf_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "access_token_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "refresh_token_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      } catch (e) {
        // Ignore cookie errors
        console.warn("Failed to clear cookies:", e);
      }

      // Clear user state
      setUser(null);

      // Redirect to home after logout
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);

      // Even if the API call fails, still clear local state and redirect
      setUser(null);
      navigate('/');

      throw error;
    }
  };

  const updateUser = async (data: { username?: string; password?: string }) => {
    try {
      await authApi.updateMe(data);
      await refreshUser(); // Refresh user data after update
    } catch (error) {
      console.error('Update user failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Try to fetch user data on app load
    refreshUser();
  }, [refreshUser]);

  const value: UserContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
