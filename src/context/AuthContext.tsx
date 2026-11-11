import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'yd_auth_guest_mode';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setIsGuest(false);
            localStorage.removeItem(GUEST_STORAGE_KEY);
          }
          setIsLoading(false);
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              setIsGuest(false);
              localStorage.removeItem(GUEST_STORAGE_KEY);
            }
            setIsLoading(false);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      setSession(data.session);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Google OAuth sign-in error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    } catch {}
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isGuest,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        continueAsGuest,
        resetPassword,
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

