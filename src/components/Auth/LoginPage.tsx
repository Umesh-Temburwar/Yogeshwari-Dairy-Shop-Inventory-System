import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Milk,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  AlertCircle,
  Layers,
  Clock,
  ReceiptIndianRupee,
  Loader2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, continueAsGuest, resetPassword } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();

  // Mode: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // Form-level alert messages
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Env flags (default false in production unless explicitly 'true')
  const isGuestModeEnabled = import.meta.env.VITE_ENABLE_GUEST_MODE === 'true';
  const isRegistrationEnabled = import.meta.env.VITE_ENABLE_REGISTRATION === 'true';

  // Zod Schemas based on current mode
  const signInSchema = z.object({
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') }),
    password: z.string().min(1, { message: t('authPasswordRequired') }).min(6, { message: t('authPasswordMinLength') }),
    rememberMe: z.boolean().optional()
  });

  const signUpSchema = z.object({
    fullName: z.string().min(1, { message: t('authFullNameRequired') }),
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') }),
    password: z.string().min(1, { message: t('authPasswordRequired') }).min(6, { message: t('authPasswordMinLength') })
  });

  const forgotSchema = z.object({
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') })
  });

  type SignInFormData = z.infer<typeof signInSchema>;
  type SignUpFormData = z.infer<typeof signUpSchema>;
  type ForgotFormData = z.infer<typeof forgotSchema>;

  // React Hook Form for Sign In
  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
    reset: resetSignIn
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // React Hook Form for Sign Up
  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
    reset: resetSignUp
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: ''
    }
  });

  // React Hook Form for Forgot Password
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
    reset: resetForgot
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: ''
    }
  });

  // Check Caps Lock on password inputs
  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  // Sign In Submission
  const onSignIn = async (data: SignInFormData) => {
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    try {
      const { error } = await signInWithEmail(data.email.trim(), data.password);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
          setFormError(t('authInvalidCredentials'));
        } else if (msg.includes('too many') || msg.includes('rate limit')) {
          setFormError(t('authTooManyAttempts'));
        } else if (msg.includes('network') || msg.includes('fetch')) {
          setFormError(t('authNetworkError'));
        } else {
          setFormError(t('authInvalidCredentials'));
        }
      }
    } catch {
      setFormError(t('authNetworkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign Up Submission
  const onSignUp = async (data: SignUpFormData) => {
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    try {
      const { error } = await signUpWithEmail(data.email.trim(), data.password, data.fullName.trim());
      if (error) {
        setFormError(error.message || t('authInvalidCredentials'));
      } else {
        setFormSuccess(t('authAccountCreated'));
        resetSignUp();
        setMode('signin');
      }
    } catch {
      setFormError(t('authNetworkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password Submission
  const onForgot = async (data: ForgotFormData) => {
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    try {
      const { error } = await resetPassword(data.email.trim());
      if (error) {
        setFormError(error.message);
      } else {
        setFormSuccess(t('authResetEmailSent'));
        resetForgot();
      }
    } catch {
      setFormError(t('authNetworkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Auth handler
  const handleGoogleAuth = async () => {
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFormError(t('authGoogleFailed'));
      }
    } catch {
      setFormError(t('authGoogleFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch modes cleanly
  const switchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    setFormError(null);
    setFormSuccess(null);
    setShowPassword(false);
    setIsCapsLockOn(false);
    resetSignIn();
    resetSignUp();
    resetForgot();
  };

  return (
    <div className="min-h-dvh lg:h-dvh lg:max-h-dvh flex flex-col lg:flex-row bg-[#f8fafc] dark:bg-[#0B1210] text-slate-900 dark:text-[#E7F0EC] transition-colors selection:bg-emerald-500 selection:text-white lg:overflow-hidden font-sans relative">
      
      {/* Accessibility Skip-To-Form Link */}
      <a
        href="#auth-form-card"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        {t('authSkipToForm')}
      </a>

      {/* ============================================================ */}
      {/* LEFT BRAND PANEL (Desktop Only, exactly 52% width)           */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-8 xl:p-10 text-white overflow-hidden select-none">
        
        {/* Full-bleed Optimized Hero Image Background with Dark Green Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-[#051710]">
          <picture>
            <source srcSet="/YDP.webp" type="image/webp" />
            <img
              src="/YDP.jpg"
              alt="Yogeshwari Dairy Products Store"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
          </picture>
          {/* Subtle gradient overlay: 40% opacity at top to 90% opacity at bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#051710]/40 via-[#051710]/75 to-[#051710]/95" />
        </div>

        {/* Ambient Glow Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding (YDO Logo + Dairy Shop Name - sitting prominently on top of the photo) */}
        <div className="relative z-10 flex items-center gap-3.5 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 w-fit shadow-xl">
          <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-white p-1 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src="/YDO_logo.jpg"
              alt="Yogeshwari Dairy Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base xl:text-xl font-black tracking-tight text-white leading-tight">
              {t('shopName')}
            </h1>
            <span className="text-[11px] font-semibold text-emerald-300 block">
              {t('shopSubtitle')}
            </span>
          </div>
        </div>

        {/* Bottom Stacked Section: Badge + Headline + Description + Feature Grid + Footer */}
        <div className="relative z-10 mt-auto flex flex-col space-y-3.5 xl:space-y-4 pt-4">
          
          {/* Small Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold w-fit backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('authErpBadge')}</span>
          </div>

          {/* Headline (Max 2 lines) */}
          <h2 className="text-2xl xl:text-3xl font-black leading-tight tracking-tight text-white line-clamp-2">
            {t('authHeadline')}
          </h2>

          {/* 2-line Description */}
          <p className="text-slate-300 text-xs xl:text-sm leading-relaxed line-clamp-2 max-w-xl">
            {t('authDescription')}
          </p>

          {/* Compact 2x2 Feature Grid */}
          <div className="grid grid-cols-2 gap-2.5 xl:gap-3 pt-1">
            
            {/* Feature 1: Multi-Batch */}
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md space-y-0.5 hover:bg-white/[0.12] transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xs xl:text-sm text-white truncate">
                  {t('authFeatureBatchTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300/85 leading-snug line-clamp-1 pl-8">
                {t('authFeatureBatchDesc')}
              </p>
            </div>

            {/* Feature 2: FEFO Expiry */}
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md space-y-0.5 hover:bg-white/[0.12] transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xs xl:text-sm text-white truncate">
                  {t('authFeatureFefoTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300/85 leading-snug line-clamp-1 pl-8">
                {t('authFeatureFefoDesc')}
              </p>
            </div>

            {/* Feature 3: Fast Counter POS */}
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md space-y-0.5 hover:bg-white/[0.12] transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs shrink-0">
                  <ReceiptIndianRupee className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xs xl:text-sm text-white truncate">
                  {t('authFeatureBillingTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300/85 leading-snug line-clamp-1 pl-8">
                {t('authFeatureBillingDesc')}
              </p>
            </div>

            {/* Feature 4: Secure Cloud Sync */}
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md space-y-0.5 hover:bg-white/[0.12] transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xs xl:text-sm text-white truncate">
                  {t('authFeatureCloudTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300/85 leading-snug line-clamp-1 pl-8">
                {t('authFeatureCloudDesc')}
              </p>
            </div>

          </div>

          {/* Footer Row */}
          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>&copy; {new Date().getFullYear()} {t('authCopyright')}</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('authEnterpriseGrade')}</span>
            </span>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* RIGHT FORM PANEL (Mobile: 100%, Desktop: 48% width)         */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[48%] flex flex-col justify-between h-full bg-[#f8fafc] dark:bg-[#0B1210] relative overflow-y-auto lg:overflow-y-hidden">
        
        {/* Top Controls Bar (Language Switcher on Left, Theme Toggle on Right) */}
        <div className="p-6 pb-2 sm:pb-4 flex items-center justify-between gap-3 shrink-0">
          
          {/* Segmented Language Switcher (Plain text labels: मराठी | हिंदी | English) */}
          <div
            role="group"
            aria-label="Language selector"
            className="inline-flex items-center bg-slate-200/80 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-300/60 dark:border-[#24352F]"
          >
            {(['mr', 'hi', 'en'] as const).map((code) => {
              const label = code === 'mr' ? 'मराठी' : code === 'hi' ? 'हिंदी' : 'English';
              const isActive = language === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all font-semibold select-none ${
                    isActive
                      ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold border border-slate-200/50 dark:border-[#24352F]'
                      : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200/70 dark:hover:bg-[#1A2A25] border border-slate-300/60 dark:border-[#24352F] transition-transform active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label={t('authToggleTheme')}
            title={t('authToggleTheme')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>

        {/* Center Form Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-3 my-auto">
          
          {/* Mobile-Only Compact Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md border border-slate-200 dark:border-[#24352F] shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src="/YDO_logo.jpg"
                alt="Yogeshwari Dairy Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                {t('shopName')}
              </h2>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {t('shopSubtitle')}
              </span>
            </div>
          </div>

          {/* Form Card Container */}
          <div
            id="auth-form-card"
            className="w-full max-w-[420px] bg-white dark:bg-[#131F1B] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-[#24352F] shadow-sm transition-all"
          >
            {/* Header: Title & Subtitle with YDO Logo */}
            <div className="mb-5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1A2A25] p-1 border border-slate-200 dark:border-[#24352F] shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src="/YDO_logo.jpg"
                  alt="Yogeshwari Dairy Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  {mode === 'signin' && t('authSignInTitle')}
                  {mode === 'signup' && t('authSignUpTitle')}
                  {mode === 'forgot' && t('authForgotTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5 font-medium">
                  {mode === 'signin' && t('authSignInSubtitle')}
                  {mode === 'signup' && t('authSignUpSubtitle')}
                  {mode === 'forgot' && t('authForgotSubtitle')}
                </p>
              </div>
            </div>

            {/* Form-Level Error Banner */}
            {formError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-semibold"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form-Level Success Banner */}
            {formSuccess && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* ============================================== */}
            {/* 1. SIGN IN FORM FLOW                           */}
            {/* ============================================== */}
            {mode === 'signin' && (
              <div className="space-y-4">
                
                {/* 1. Google Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] hover:bg-slate-50 dark:hover:bg-[#20332D] text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-xs active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t('authContinueGoogle')}</span>
                </button>

                {/* 2. Divider ("or with email") */}
                <div className="relative flex items-center justify-center my-3" aria-hidden="true">
                  <div className="border-t border-slate-200 dark:border-[#24352F] w-full" />
                  <span className="bg-white dark:bg-[#131F1B] px-3 text-[11px] font-bold text-slate-400 dark:text-[#8FA69C] lowercase tracking-wider shrink-0">
                    {t('authOrWithEmail')}
                  </span>
                  <div className="border-t border-slate-200 dark:border-[#24352F] w-full" />
                </div>

                {/* 3. Form */}
                <form onSubmit={handleSignInSubmit(onSignIn)} className="space-y-3.5" noValidate>
                  
                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="signin-email"
                      className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                    >
                      {t('authEmail')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                      <input
                        id="signin-email"
                        type="email"
                        inputMode="email"
                        autoComplete="username"
                        autoFocus
                        placeholder={t('authEmailPlaceholder')}
                        aria-invalid={signInErrors.email ? 'true' : 'false'}
                        aria-describedby={signInErrors.email ? 'signin-email-error' : undefined}
                        {...registerSignIn('email')}
                        className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          signInErrors.email
                            ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                            : 'border-slate-300 dark:border-[#24352F]'
                        }`}
                      />
                    </div>
                    {signInErrors.email && (
                      <p id="signin-email-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{signInErrors.email.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                    >
                      {t('authPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                      <input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('authPasswordPlaceholder')}
                        aria-invalid={signInErrors.password ? 'true' : 'false'}
                        aria-describedby={signInErrors.password ? 'signin-password-error' : undefined}
                        {...registerSignIn('password')}
                        onKeyDown={handleKeyModifier}
                        onKeyUp={handleKeyModifier}
                        className={`w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          signInErrors.password
                            ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                            : 'border-slate-300 dark:border-[#24352F]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('authHidePassword') : t('authShowPassword')}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Caps Lock Indicator */}
                    {isCapsLockOn && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('authCapsLockOn')}</span>
                      </p>
                    )}

                    {signInErrors.password && (
                      <p id="signin-password-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{signInErrors.password.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...registerSignIn('rememberMe')}
                        className="w-4 h-4 rounded border-slate-300 dark:border-[#24352F] text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1A2A25]"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-[#8FA69C]">
                        {t('authRememberMe')}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {t('authForgotPassword')}
                    </button>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('authSigningIn')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('authSignInButton')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                </form>

                {/* Conditional Registration Link (Env Flag) */}
                {isRegistrationEnabled && (
                  <div className="text-center text-xs text-slate-600 dark:text-[#8FA69C] pt-2">
                    <span>{t('authNewOperator')} </span>
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {t('authRegisterHere')}
                    </button>
                  </div>
                )}

                {/* Conditional Guest Mode Button (Env Flag) */}
                {isGuestModeEnabled && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#24352F]">
                    <button
                      type="button"
                      onClick={continueAsGuest}
                      className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#20332D] text-slate-700 dark:text-[#E7F0EC] text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.99]"
                    >
                      <span>{t('authGuestMode')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* ============================================== */}
            {/* 2. SIGN UP FORM FLOW                           */}
            {/* ============================================== */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-3.5" noValidate>
                
                {/* Full Name Field */}
                <div>
                  <label
                    htmlFor="signup-fullname"
                    className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                  >
                    {t('authFullName')}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                    <input
                      id="signup-fullname"
                      type="text"
                      autoFocus
                      placeholder={t('authFullNamePlaceholder')}
                      aria-invalid={signUpErrors.fullName ? 'true' : 'false'}
                      aria-describedby={signUpErrors.fullName ? 'signup-name-error' : undefined}
                      {...registerSignUp('fullName')}
                      className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        signUpErrors.fullName
                          ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-[#24352F]'
                      }`}
                    />
                  </div>
                  {signUpErrors.fullName && (
                    <p id="signup-name-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{signUpErrors.fullName.message}</span>
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                  >
                    {t('authEmail')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      placeholder={t('authEmailPlaceholder')}
                      aria-invalid={signUpErrors.email ? 'true' : 'false'}
                      aria-describedby={signUpErrors.email ? 'signup-email-error' : undefined}
                      {...registerSignUp('email')}
                      className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        signUpErrors.email
                          ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-[#24352F]'
                      }`}
                    />
                  </div>
                  {signUpErrors.email && (
                    <p id="signup-email-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{signUpErrors.email.message}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                  >
                    {t('authPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={t('authPasswordPlaceholder')}
                      aria-invalid={signUpErrors.password ? 'true' : 'false'}
                      aria-describedby={signUpErrors.password ? 'signup-password-error' : undefined}
                      {...registerSignUp('password')}
                      onKeyDown={handleKeyModifier}
                      onKeyUp={handleKeyModifier}
                      className={`w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        signUpErrors.password
                          ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-[#24352F]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('authHidePassword') : t('authShowPassword')}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isCapsLockOn && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('authCapsLockOn')}</span>
                    </p>
                  )}
                  {signUpErrors.password && (
                    <p id="signup-password-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{signUpErrors.password.message}</span>
                    </p>
                  )}
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('authCreatingAccount')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('authCreateAccountButton')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Back to Sign In Link */}
                <div className="text-center text-xs text-slate-600 dark:text-[#8FA69C] pt-2">
                  <span>{t('authAlreadyHaveAccount')} </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {t('authBackToSignIn')}
                  </button>
                </div>

              </form>
            )}

            {/* ============================================== */}
            {/* 3. FORGOT PASSWORD FLOW                        */}
            {/* ============================================== */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-3.5" noValidate>
                
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5"
                  >
                    {t('authEmail')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      inputMode="email"
                      autoFocus
                      placeholder={t('authEmailPlaceholder')}
                      aria-invalid={forgotErrors.email ? 'true' : 'false'}
                      aria-describedby={forgotErrors.email ? 'forgot-email-error' : undefined}
                      {...registerForgot('email')}
                      className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-[#f8fafc] dark:bg-[#1A2A25] rounded-xl text-xs text-slate-900 dark:text-white font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        forgotErrors.email
                          ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-[#24352F]'
                      }`}
                    />
                  </div>
                  {forgotErrors.email && (
                    <p id="forgot-email-error" className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{forgotErrors.email.message}</span>
                    </p>
                  )}
                </div>

                {/* Send Reset Link Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('authSendingResetLink')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('authSendResetLink')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Back to Sign In Link */}
                <div className="text-center text-xs text-slate-600 dark:text-[#8FA69C] pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    &larr; {t('authBackToSignIn')}
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>

        {/* Pinned Bottom Help Footer */}
        <div className="p-6 pt-2 text-center text-xs text-slate-500 dark:text-[#8FA69C] shrink-0">
          <span>{t('authFooterHelp')}</span>
        </div>

      </div>

    </div>
  );
};
