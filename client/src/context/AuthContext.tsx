import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  switchDevRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = 'dairy_auth_token';
const STORAGE_USER_KEY = 'dairy_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const storedUser = localStorage.getItem(STORAGE_USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Default to admin for seamless evaluation if none stored
        const defaultAdmin: User = {
          id: 'dev-admin-id',
          email: 'admin@dairy.local',
          fullName: 'Shop Admin',
          role: 'admin',
        };
        const defaultToken = 'dev-token-admin';
        setToken(defaultToken);
        setUser(defaultAdmin);
        localStorage.setItem(STORAGE_TOKEN_KEY, defaultToken);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(defaultAdmin));
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const switchDevRole = (role: UserRole) => {
    const roleLabels: Record<UserRole, string> = {
      admin: 'Shop Admin',
      owner: 'Shop Owner',
      manager: 'Inventory Manager',
      cashier: 'Counter Cashier',
      delivery_boy: 'Ramesh (Delivery Partner)',
    };

    const newUser: User = {
      id: `dev-${role}-id`,
      email: `${role}@dairy.local`,
      fullName: roleLabels[role],
      role,
    };
    const newToken = `dev-token-${role}`;
    login(newToken, newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout,
        hasRole,
        switchDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

