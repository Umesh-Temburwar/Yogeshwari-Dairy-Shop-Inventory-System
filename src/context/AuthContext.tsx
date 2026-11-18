import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
  supabase,
  isInvalidRefreshTokenError,
  clearStaleSupabaseAuthSession
} from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { 
  verifyMasterPasscode, 
  isSessionSecurityValid, 
  revokeSessionSecurity,
  grantBiometricSecurityUnlock,
  syncMasterPasscodeHashFromCloud
} from '../lib/security';
import { 
  isRegistrationAllowedSync, 
  syncRegistrationSettingFromCloud 
} from '../lib/registrationConfig';

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
  unlockSecurity: (passcode: string, deferReveal?: boolean) => Promise<{
    success: boolean;
    attemptsLeft: number;
    lockedUntil: number | null;
    error?: string;
  }>;
  unlockSecurityWithBiometrics: (deferReveal?: boolean) => Promise<boolean>;
  confirmSecurityUnlock: () => void;
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
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
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
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const pendingUnlockVerifiedRef = useRef<boolean>(false);
  // Tracks whether a genuine Supabase cloud session was active in this tab
  const hadCloudSessionRef = useRef<boolean>(false);
  // Single-flight circuit breaker to prevent infinite refresh/recovery loops
  const hasRecoveredInvalidSessionRef = useRef<boolean>(false);

  const clearSessionExpiredNotice = useCallback(() => {
    setSessionExpiredNotice(null);
  }, []);

  const applyRoleForUser = useCallback((authUser: User) => {
    const userEmail = authUser.email?.trim().toLowerCase() || '';
    const isAdmin = userEmail === 'nilusakhare2003@gmail.com' || userEmail.includes('nilu');
    const nextRole: UserRole = isAdmin
      ? 'Admin'
      : authUser.user_metadata?.role === 'Admin' || authUser.user_metadata?.role === 'Owner'
      ? (authUser.user_metadata.role as UserRole)
      : 'Owner';
    const nextSlot: 1 | 2 | null = nextRole === 'Admin' ? 1 : null;

    setRoleState(nextRole);
    setAdminSlotState(nextSlot);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
      if (nextRole === 'Admin') {
        localStorage.setItem(ADMIN_SLOT_STORAGE_KEY, String(nextSlot || 1));
      } else {
        localStorage.removeItem(ADMIN_SLOT_STORAGE_KEY);
      }
    } catch {}
  }, []);

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

  const lockSecurity = useCallback(() => {
    revokeSessionSecurity();
    pendingUnlockVerifiedRef.current = false;
    setIsSecurityUnlocked(false);
  }, []);

  const unlockSecurity = async (passcode: string, deferReveal = false) => {
    const res = await verifyMasterPasscode(passcode);
    if (res.success) {
      if (deferReveal) {
        pendingUnlockVerifiedRef.current = true;
      } else {
        pendingUnlockVerifiedRef.current = false;
        setIsSecurityUnlocked(true);
      }
    }
    return res;
  };

  const unlockSecurityWithBiometrics = async (deferReveal = false): Promise<boolean> => {
    const granted = await grantBiometricSecurityUnlock();
    if (granted) {
      if (deferReveal) {
        pendingUnlockVerifiedRef.current = true;
      } else {
        pendingUnlockVerifiedRef.current = false;
        setIsSecurityUnlocked(true);
      }
      return true;
    }
    return false;
  };

  const confirmSecurityUnlock = useCallback(() => {
    if (pendingUnlockVerifiedRef.current) {
      pendingUnlockVerifiedRef.current = false;
      setIsSecurityUnlocked(true);
    }
  }, []);

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

    const recoverFromUnrecoverableSession = async () => {
      if (hasRecoveredInvalidSessionRef.current) return;
      hasRecoveredInvalidSessionRef.current = true;
      hadCloudSessionRef.current = false;

      console.warn('Supabase session expired or refresh token invalid; clearing local auth session.');
      await clearStaleSupabaseAuthSession();

      try {
        localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
      } catch {}

      if (mounted) {
        setSession(null);
        setUser(null);
        lockSecurity();
        setSessionExpiredNotice(
          'Your session has expired. Please sign in again to continue.'
        );
      }
    };

    // 1. Register onAuthStateChange SYNCHRONOUSLY so cleanup always unsubscribes (React StrictMode / HMR safe)
    const authSubscription = supabase
      ? supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!mounted) return;

          if (event === 'SIGNED_OUT') {
            setSession(null);
            if (hadCloudSessionRef.current) {
              // Live cloud session ended unexpectedly (e.g. unrecoverable mid-session refresh failure)
              hadCloudSessionRef.current = false;
              try {
                localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
              } catch {}
              setUser(null);
              lockSecurity();
              setSessionExpiredNotice(
                'Your session has expired. Please sign in again to continue.'
              );
            } else {
              // Preserve intentional offline counter session only if no cloud session was active
              const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
              if (!storedLocal) {
                setUser(null);
              }
            }
            setIsLoading(false);
            return;
          }

          if (nextSession?.user) {
            hadCloudSessionRef.current = true;
            hasRecoveredInvalidSessionRef.current = false;
            setSessionExpiredNotice(null);
            setSession(nextSession);
            setUser(nextSession.user);
            applyRoleForUser(nextSession.user);
            setIsLoading(false);
          } else if (event === 'INITIAL_SESSION') {
            setSession(null);
            // Only clear user if there is no intentional offline counter user
            const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
            if (!storedLocal) {
              setUser(null);
            }
          }
        }).data.subscription
      : null;

    async function initializeAuth() {
      try {
        // 1. Verify if the counter was already unlocked via cryptographic passcode token
        const secValid = await isSessionSecurityValid();
        if (mounted) {
          setIsSecurityUnlocked(secValid);
        }

        if (!supabase) {
          try {
            const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
            if (storedLocal && mounted) {
              setUser(JSON.parse(storedLocal));
            }
          } catch {}
          if (mounted) setIsLoading(false);
          return;
        }

        // 2. Restore initial Supabase session ONCE and handle invalid refresh tokens gracefully
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          if (isInvalidRefreshTokenError(sessionError)) {
            await recoverFromUnrecoverableSession();
          } else {
            // Transient network/offline error — do NOT clear storage or force logout
            try {
              const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
              if (storedLocal) {
                setUser(JSON.parse(storedLocal));
              }
            } catch {}
          }
        } else if (initialSession?.user) {
          hadCloudSessionRef.current = true;
          hasRecoveredInvalidSessionRef.current = false;
          setSession(initialSession);
          setUser(initialSession.user);
          applyRoleForUser(initialSession.user);
          try {
            supabase.auth.startAutoRefresh();
          } catch {}
        } else {
          // No active Supabase session — restore offline counter session if present
          try {
            const storedLocal = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
            if (storedLocal) {
              setUser(JSON.parse(storedLocal));
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        }

        if (mounted) {
          setIsLoading(false);
        }

        // 3. Run background cloud config sync AFTER session restoration settles so queries never race token refresh
        syncRegistrationSettingFromCloud().catch(() => {});
        syncMasterPasscodeHashFromCloud().catch(() => {});
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          await recoverFromUnrecoverableSession();
        } else {
          console.warn('Auth initialization warning:', err instanceof Error ? err.message : 'Unknown error');
        }
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, [applyRoleForUser, lockSecurity]);

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
    setSessionExpiredNotice(null);
    const cleanEmail = email.trim().toLowerCase();

    // Recognized 1 Owner & 2 Admin credentials
    const { role: assignedRole, slot: assignedSlot, redirectView: initialRedirect, fullName: defaultFullName } = detectRoleAndSlot(cleanEmail);
    let targetRedirect: 'dashboard' | 'pos' | 'inventory' = initialRedirect;

    try {
      // 1. Try Supabase Auth
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!error && data.user) {
            hadCloudSessionRef.current = true;
            hasRecoveredInvalidSessionRef.current = false;
            try {
              localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
              supabase.auth.startAutoRefresh();
            } catch {}

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
                const cleanView = prof.default_redirect_view.split(':')[0].trim();
                if (cleanView === 'dashboard' || cleanView === 'pos' || cleanView === 'inventory') {
                  targetRedirect = cleanView;
                }
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
          console.warn('Supabase auth sign in failed:', err instanceof Error ? err.message : 'Unknown error');
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

        hadCloudSessionRef.current = false;
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
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with Email (Supports Owner & Admin registration with auto-linking)
  const signUpWithEmail = async (
    email: string, 
    password: string, 
    fullName?: string, 
    roleChoice?: UserRole, 
    slotChoice?: 1 | 2 | null
  ) => {
    // Security Gatekeeper: Check if registration is allowed by Shop Owner Nikhil Sakhare
    if (!isRegistrationAllowedSync()) {
      return { 
        error: { 
          message: 'नवीन ऑपरेटर नोंदणी सध्या दुकान मालक निखिल सखारे यांच्याद्वारे बंद करण्यात आली आहे. (New operator registration is currently disabled by Shop Owner Nikhil Sakhare).' 
        } 
      };
    }

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

  // Sign Out (local scope so signing out on one counter/browser does not invalidate other shop devices' refresh tokens)
  const signOut = async () => {
    setIsLoading(true);
    hadCloudSessionRef.current = false;
    setSessionExpiredNotice(null);
    try {
      if (supabase) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutErr) {
          // If the token was already invalid/expired, ensure local auth storage is cleanly cleared
          if (isInvalidRefreshTokenError(signOutErr)) {
            await clearStaleSupabaseAuthSession();
          }
        }
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
      console.warn('Sign out warning:', err instanceof Error ? err.message : 'Unknown error');
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
        confirmSecurityUnlock,
        lockSecurity,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        continueAsGuest,
        resetPassword,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
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
