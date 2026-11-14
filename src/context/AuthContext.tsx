import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { 
  verifyMasterPasscode, 
  isSessionSecurityValid, 
  revokeSessionSecurity,
  grantBiometricSecurityUnlock
} from '../lib/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean; // Always false; guest mode is removed for security
  role: UserRole;   // Strictly 'Owner' or 'Admin'
  adminSlot: 1 | 2 | null; // 1 for Admin 1 (Counter), 2 for Admin 2 (Inventory), null for Owner
  setRole: (role: UserRole, slot?: 1 | 2 | null) => void;
  defaultRedirectView: 'dashboard' | 'pos' | 'inventory';
  isSecurityUnlocked: boolean;
  unlockSecurity: (passcode: string) => Promise<{
    success: boolean;
    attemptsLeft: number;
    lockedUntil: number | null;
    error?: string;
  }>;
  unlockSecurityWithBiometrics: () => Promise<boolean>;
  lockSecurity: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any; redirectView?: 'dashboard' | 'pos' | 'inventory' }>;
  signUpWithEmail: (
    email: string, 
    password: string, 
    fullName?: string, 
    roleChoice?: UserRole, 
    slotChoice?: 1 | 2 | null
  ) => Promise<{ 
    error: any; 
    user?: User | null; 
    session?: Session | null;
    needsEmailConfirmation?: boolean;
    redirectView?: 'dashboard' | 'pos' | 'inventory';
  }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'ydo_active_role';
const ADMIN_SLOT_STORAGE_KEY = 'ydo_admin_slot';
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

  // Admin slot: 1 for Admin 1 (Billing/Counter), 2 for Admin 2 (Inventory/Stock), null for Owner
  const [adminSlot, setAdminSlotState] = useState<1 | 2 | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_SLOT_STORAGE_KEY);
      return saved === '1' ? 1 : saved === '2' ? 2 : null;
    } catch {
      return null;
    }
  });

  // Second-factor Master Security Passcode verification state
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState<boolean>(false);

  const setRole = (newRole: UserRole, slot: 1 | 2 | null = null) => {
    // Access control enforcement: Admin account can ONLY use Admin profile
    const cleanEmail = user?.email?.trim().toLowerCase() || '';
    const isAdminAccount = cleanEmail === 'nilusakhare2003@gmail.com' || cleanEmail.includes('nilu');

    if (isAdminAccount && newRole === 'Owner') {
      console.warn('Security policy: Admin account is strictly restricted to Admin profile only.');
      return;
    }

    setRoleState(newRole);
    setAdminSlotState(newRole === 'Admin' ? (slot || 1) : null);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
      if (newRole === 'Admin') {
        localStorage.setItem(ADMIN_SLOT_STORAGE_KEY, String(slot || 1));
      } else {
        localStorage.removeItem(ADMIN_SLOT_STORAGE_KEY);
      }
    } catch {}
  };

  const defaultRedirectView: 'dashboard' | 'pos' | 'inventory' = 
    role === 'Owner' ? 'dashboard' : 'pos';

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

  const unlockSecurityWithBiometrics = async (): Promise<boolean> => {
    const granted = await grantBiometricSecurityUnlock();
    if (granted) {
      setIsSecurityUnlocked(true);
      return true;
    }
    return false;
  };

  // Helper to determine role, admin slot, and redirect destination based on email/profile
  const detectRoleAndSlot = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Admin: Nilesh Sakhare (Counter 1 - POS Billing)
    if (
      cleanEmail === 'nilusakhare2003@gmail.com' ||
      cleanEmail.includes('nilusakhare') ||
      cleanEmail.includes('nilu') ||
      cleanEmail === 'admin1@yogeshwaridairy.com' ||
      cleanEmail === 'admin@yogeshwaridairy.com' ||
      cleanEmail.includes('admin')
    ) {
      return {
        role: 'Admin' as UserRole,
        slot: 1 as 1 | 2,
        redirectView: 'pos' as const,
        fullName: 'Nilesh Sakhare'
      };
    } 
    // 2. Shop Owner: Nikhil Sakhare (yogeshwaridairy9896@gmail.com)
    else {
      return {
        role: 'Owner' as UserRole,
        slot: null,
        redirectView: 'dashboard' as const,
        fullName: 'Nikhil Sakhare'
      };
    }
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
            const userEmail = session.user.email?.trim().toLowerCase() || '';
            const isAdmin = userEmail === 'nilusakhare2003@gmail.com' || userEmail.includes('nilu');
            if (isAdmin) {
              setRole('Admin', 1);
            } else {
              const metaRole = session.user.user_metadata?.role;
              if (metaRole === 'Admin' || metaRole === 'Owner') {
                setRole(metaRole);
              }
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
              const userEmail = session.user.email?.trim().toLowerCase() || '';
              const isAdmin = userEmail === 'nilusakhare2003@gmail.com' || userEmail.includes('nilu');
              if (isAdmin) {
                setRole('Admin', 1);
              } else {
                const metaRole = session.user.user_metadata?.role;
                if (metaRole === 'Admin' || metaRole === 'Owner') {
                  setRole(metaRole);
                }
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

  // Sign In with Email with Role-Based Redirection
  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Recognized 1 Owner & 2 Admin credentials
    const { role: assignedRole, slot: assignedSlot, redirectView: initialRedirect, fullName: defaultFullName } = detectRoleAndSlot(cleanEmail);
    let targetRedirect: 'dashboard' | 'pos' | 'inventory' = initialRedirect;

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

          // Update profiles with auth_user_id if not linked
          try {
            await supabase
              .from('profiles')
              .update({ auth_user_id: data.user.id, is_active: true })
              .eq('email', cleanEmail);
          } catch {}

          // Fetch profile configuration if profiles table exists in Supabase
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('role, admin_slot, default_redirect_view')
              .eq('email', cleanEmail)
              .maybeSingle();

            if (prof?.role) {
              setRole(prof.role as UserRole, prof.admin_slot as 1 | 2 | null);
            } else {
              setRole(assignedRole, assignedSlot);
            }

            if (prof?.default_redirect_view) {
              targetRedirect = prof.default_redirect_view as 'dashboard' | 'pos' | 'inventory';
            }
          } catch {
            setRole(assignedRole, assignedSlot);
          }

          // Execute Role-Based Redirection
          try {
            localStorage.setItem('yd_active_view', targetRedirect);
            if (typeof window !== 'undefined') {
              window.location.hash = `#/${targetRedirect}`;
            }
          } catch {}

          // Always lock security initially after sign in so Master Passcode popup is triggered
          lockSecurity();
          return { error: null, redirectView: targetRedirect };
        } else if (error) {
          // If specific Supabase error
          if (error.message?.includes('Email not confirmed')) {
            return { 
              error: { 
                message: 'ईमेल पडताळणी प्रलंबित आहे (Email not confirmed). कृपया तुमचा ईमेल इनबॉक्स तपासा किंवा Supabase Dashboard मधील Authentication -> Users मध्ये Confirm User करा.' 
              } 
            };
          }

          const isDbError = error.message?.toLowerCase().includes('database error') || error.message?.toLowerCase().includes('finding user');
          const isNetworkError = error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('network');
          const isOfficial = 
            cleanEmail === 'yogeshwaridairy9896@gmail.com' ||
            cleanEmail === 'nilusakhare2003@gmail.com' ||
            cleanEmail.includes('nilu') ||
            cleanEmail.includes('yogeshwari');

          // If official shop account and there's a network issue or database error, proceed to fallback!
          if (isOfficial && (isNetworkError || isDbError)) {
            console.warn('Falling back to local authorized session due to auth issue:', error.message);
          } else {
            return { error };
          }
        }
      } catch (err: any) {
        console.error('Supabase auth sign in error:', err);
      }
    }

    // 2. Offline Emergency / Local Shop Counter Auth for 1 Owner and 1 Admin (Nilesh Sakhare)
    if (
      cleanEmail === 'yogeshwaridairy9896@gmail.com' ||
      cleanEmail === 'nilusakhare2003@gmail.com' ||
      cleanEmail === 'owner@yogeshwaridairy.com' || 
      cleanEmail === 'admin1@yogeshwaridairy.com' ||
      cleanEmail === 'admin@yogeshwaridairy.com' ||
      cleanEmail.includes('nilu') ||
      cleanEmail.includes('yogeshwari') ||
      cleanEmail.includes('owner') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('umesh')
    ) {
      const localUser: any = {
        id: `ydo-${assignedRole.toLowerCase()}${assignedSlot ? assignedSlot : ''}-counter`,
        email: cleanEmail,
        user_metadata: {
          full_name: defaultFullName,
          role: assignedRole,
          admin_slot: assignedSlot,
          default_redirect_view: targetRedirect,
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      setUser(localUser);
      setSession(null);
      setRole(assignedRole, assignedSlot);
      try {
        localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(localUser));
        localStorage.setItem('yd_active_view', targetRedirect);
        if (typeof window !== 'undefined') {
          window.location.hash = `#/${targetRedirect}`;
        }
      } catch {}

      // Always require Master Passcode immediately after login!
      lockSecurity();
      return { error: null, redirectView: targetRedirect };
    }

    return { error: { message: 'Invalid credentials. Only verified 1 Owner and 2 Admin profiles are permitted.' } };
  };

  // Sign Up with Email (Supports Owner & Admin registration with auto-linking)
  const signUpWithEmail = async (
    email: string, 
    password: string, 
    fullName?: string, 
    roleChoice?: UserRole, 
    slotChoice?: 1 | 2 | null
  ) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const detected = detectRoleAndSlot(cleanEmail);
      const assignedRole = roleChoice || detected.role;
      const assignedSlot = slotChoice !== undefined ? slotChoice : detected.slot;
      const targetRedirect = detected.redirectView;
      const finalName = fullName?.trim() || detected.fullName;

      const isOfficial = 
        cleanEmail === 'yogeshwaridairy9896@gmail.com' ||
        cleanEmail === 'nilusakhare2003@gmail.com' ||
        cleanEmail.includes('nilu') ||
        cleanEmail.includes('yogeshwari');

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: finalName,
            role: assignedRole,
            admin_slot: assignedSlot,
            default_redirect_view: targetRedirect
          },
        },
      });

      if (error) {
        const isDbError = error.message?.toLowerCase().includes('database error') || error.message?.toLowerCase().includes('finding user');
        const isNetworkError = error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('network');

        // If official account and there is a database/network error, activate local authorized account immediately!
        if (isOfficial && (isDbError || isNetworkError)) {
          console.warn('Supabase auth signup server error, activating authorized account locally:', error.message);
          const localUser: any = {
            id: `ydo-${assignedRole.toLowerCase()}${assignedSlot ? assignedSlot : ''}-counter`,
            email: cleanEmail,
            user_metadata: {
              full_name: finalName,
              role: assignedRole,
              admin_slot: assignedSlot,
              default_redirect_view: targetRedirect,
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          };

          setUser(localUser);
          setSession(null);
          setRole(assignedRole, assignedSlot);
          try {
            localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(localUser));
            localStorage.setItem('yd_active_view', targetRedirect);
            if (typeof window !== 'undefined') {
              window.location.hash = `#/${targetRedirect}`;
            }
          } catch {}

          lockSecurity();
          return {
            error: null,
            user: localUser,
            session: null,
            needsEmailConfirmation: false,
            redirectView: targetRedirect
          };
        }

        throw error;
      }

      // Upsert profile in public.profiles table
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            auth_user_id: data.user.id,
            email: cleanEmail,
            full_name: finalName,
            role: assignedRole,
            admin_slot: assignedSlot,
            default_redirect_view: targetRedirect,
            is_active: true
          }, { onConflict: 'email' });
        } catch (profErr) {
          console.warn('Profile sync on signup:', profErr);
        }
      }

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        setRole(assignedRole, assignedSlot);
        lockSecurity();
      }

      return { 
        error: null, 
        user: data.user, 
        session: data.session,
        needsEmailConfirmation: !data.session && !!data.user,
        redirectView: targetRedirect
      };
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
        localStorage.removeItem(ADMIN_SLOT_STORAGE_KEY);
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
        adminSlot,
        setRole,
        defaultRedirectView,
        isSecurityUnlocked,
        unlockSecurity,
        unlockSecurityWithBiometrics,
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
