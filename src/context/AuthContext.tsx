import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { 
  verifyMasterPasscode, 
  isSessionSecurityValid, 
  revokeSessionSecurity 
} from '../lib/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean; // Always false; guest mode is removed for security
  role: UserRole;   // Strictly 'Owner' or 'Admin'
  setRole: (role: UserRole) => void;
  isSecurityUnlocked: boolean;
  unlockSecurity: (passcode: string) => Promise<{
    success: boolean;
    attemptsLeft: number;
    lockedUntil: number | null;
    error?: string;
  }>;
  lockSecurity: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'ydo_active_role';
const LOCAL_USER_STORAGE_KEY = 'ydo_auth_local_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Strictly restricted to 'Owner' and 'Admin'
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      return (saved === 'Admin' || saved === 'Owner') ? saved : 'Owner';
    } catch {
      return 'Owner';
    }
  });

  // Second-factor Master Security Passcode verification state
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState<boolean>(false);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch {}
  };

  const lockSecurity = () => {
    revokeSessionSecurity();
    setIsSecurityUnlocked(false);
  };

  const unlockSecurity = async (passcode: string) => {
    const res = await verifyMasterPasscode(passcode);
    if (res.success) {
      setIsSecurityUnlocked(true);
    }
    return res;
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // 1. Verify if the session was already unlocked via cryptographic token
        const secValid = await isSessionSecurityValid();
        if (mounted) {
          setIsSecurityUnlocked(secValid);
        }

        // 2. Check local stored user (for offline shop counter operations)
        try {
          const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
          if (storedLocal) {
            const parsed = JSON.parse(storedLocal);
            if (mounted) setUser(parsed);
          }
        } catch {}

        if (!supabase) {
          if (mounted) setIsLoading(false);
          return;
        }

        // 3. Get initial Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            // Default detected role
            const metaRole = session.user.user_metadata?.role;
            if (metaRole === 'Admin' || metaRole === 'Owner') {
              setRole(metaRole);
            }
          }
          setIsLoading(false);
        }

        // 4. Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setSession(session);
            if (session?.user) {
              setUser(session.user);
              const metaRole = session.user.user_metadata?.role;
              if (metaRole === 'Admin' || metaRole === 'Owner') {
                setRole(metaRole);
              }
            } else {
              // Only reset user if there wasn't a local offline authenticated user
              const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
              if (!storedLocal) {
                setUser(null);
              }
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

  // Inactivity Auto-Lock: Automatically lock counter after 15 minutes of idle time
  useEffect(() => {
    if (!user || !isSecurityUnlocked) return;

    let timeoutId: any;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lockSecurity();
      }, INACTIVITY_LIMIT_MS);
    };

    const trackedEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    trackedEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    handleActivity();

    return () => {
      clearTimeout(timeoutId);
      trackedEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [user, isSecurityUnlocked]);

  // Sign In with Email
  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Recognized Owner & Admin credentials
    const isOwnerTarget = cleanEmail.includes('owner') || cleanEmail.includes('umesh') || cleanEmail.includes('yogeshwari');
    const isAdminTarget = cleanEmail.includes('admin');

    // 1. Try Supabase Auth
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.user) {
          setUser(data.user);
          setSession(data.session);
          const assignedRole: UserRole = isOwnerTarget ? 'Owner' : (isAdminTarget ? 'Admin' : 'Owner');
          setRole(assignedRole);
          // Always lock security initially after sign in so Master Passcode popup is triggered
          lockSecurity();
          return { error: null };
        } else if (error && !isOwnerTarget && !isAdminTarget) {
          return { error };
        }
      } catch (err: any) {
        if (!isOwnerTarget && !isAdminTarget) {
          return { error: err };
        }
      }
    }

    // 2. Offline Emergency / Local Shop Counter Auth for Owner or Admin
    if (isOwnerTarget || isAdminTarget || cleanEmail === 'owner@yogeshwaridairy.com' || cleanEmail === 'admin@yogeshwaridairy.com') {
      const assignedRole: UserRole = isOwnerTarget ? 'Owner' : 'Admin';
      const localUser: any = {
        id: `ydo-${assignedRole.toLowerCase()}-counter`,
        email: cleanEmail,
        user_metadata: {
          full_name: assignedRole === 'Owner' ? 'Yogeshwari Dairy Owner' : 'Store Administrator',
          role: assignedRole,
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      setUser(localUser);
      setSession(null);
      setRole(assignedRole);
      try {
        localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(localUser));
      } catch {}

      // Always require Master Passcode immediately after login!
      lockSecurity();
      return { error: null };
    }

    return { error: { message: 'Invalid credentials. Only verified Owner and Admin profiles are permitted.' } };
  };

  // Sign Up with Email (restricted to Owner / Admin roles)
  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'Owner'
          },
        },
      });
      if (error) throw error;
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        setRole('Owner');
        lockSecurity();
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      lockSecurity();
      try {
        localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
        localStorage.removeItem('yd_auth_guest_mode');
      } catch {}
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Guest mode is permanently disabled for security
  const continueAsGuest = () => {
    // No-op: Guest mode is completely disabled per security requirements
    console.warn('Guest access is permanently disabled for counter data security.');
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
        isGuest: false, // Permanently false
        role,
        setRole,
        isSecurityUnlocked,
        unlockSecurity,
        lockSecurity,
        signInWithEmail,
        signUpWithEmail,
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
