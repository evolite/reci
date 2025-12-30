import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login, register, logout, getCurrentUser, checkInvite } from '@/lib/api';

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

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const fetchUser = async (authToken: string) => {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        checkInvite: handleCheckInvite,
      }}
    >
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
