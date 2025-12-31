import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { login, register, logout, getCurrentUser, checkInvite } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, inviteToken?: string) => Promise<void>;
  logout: () => void;
  checkInvite: (token: string) => Promise<{ valid: boolean; email?: string; expiresAt?: Date }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'reci_auth_token';

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token from localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      // Fetch user info
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Helper function to check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return false; // No expiration claim, assume valid
      return Date.now() >= exp * 1000;
    } catch (error) {
      // If we can't parse the token, consider it invalid
      console.debug('Token expiration check failed:', getErrorMessage(error));
      return true;
    }
  };

  const fetchUser = async (authToken: string) => {
    // Check if token is expired before making request
    if (isTokenExpired(authToken)) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await getCurrentUser(authToken);
      setUser(response.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Token might be invalid or expired, clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      // Don't redirect here - let the ProtectedRoute handle it
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await login(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
  };

  const handleRegister = async (email: string, password: string, name?: string, inviteToken?: string) => {
    const response = await register(email, password, name, inviteToken);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    logout();
  };

  const handleCheckInvite = async (token: string) => {
    return await checkInvite(token);
  };

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkInvite: handleCheckInvite,
  }), [user, token, loading, handleLogin, handleRegister, handleLogout, handleCheckInvite]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
