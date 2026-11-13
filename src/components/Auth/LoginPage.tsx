import React, { useState } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  Layers,
  Clock,
  ReceiptIndianRupee,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button, Input, SegmentedControl } from '../ui';

export const LoginPage: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
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

  const isRegistrationEnabled = import.meta.env.VITE_ENABLE_REGISTRATION !== 'false';

  // Zod Schemas based on current mode
  const signInSchema = z.object({
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') }),
    password: z.string().min(1, { message: t('authPasswordRequired') }).min(6, { message: t('authPasswordMinLength') }),
    rememberMe: z.boolean().optional()
  });

  const signUpSchema = z.object({
    fullName: z.string().min(1, { message: t('authFullNameRequired') }),
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') }),
    password: z.string().min(1, { message: t('authPasswordRequired') }).min(6, { message: t('authPasswordMinLength') }),
    confirmPassword: z.string().min(1, { message: language === 'mr' ? 'पासवर्ड पुष्टी आवश्यक आहे' : language === 'hi' ? 'पासवर्ड पुष्टि आवश्यक है' : 'Confirm password is required' })
  }).refine((data) => data.password === data.confirmPassword, {
    message: language === 'mr' ? 'पासवर्ड जुळत नाही' : language === 'hi' ? 'पासवर्ड मेल नहीं खा रहे हैं' : 'Passwords do not match',
    path: ['confirmPassword']
  });

  const forgotSchema = z.object({
    email: z.string().min(1, { message: t('authEmailRequired') }).email({ message: t('authEmailInvalid') })
  });

  type SignInFormData = z.infer<typeof signInSchema>;
  type SignUpFormData = z.infer<typeof signUpSchema>;
  type ForgotFormData = z.infer<typeof forgotSchema>;

  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
    reset: resetSignIn
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
    reset: resetSignUp
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' }
  });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
    reset: resetForgot
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' }
  });

  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const onSignIn = async (data: SignInFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);
      const { error } = await signInWithEmail(data.email.trim(), data.password);
      if (error) {
        setFormError(error.message);
      }
    } catch {
      setFormError(t('authNetworkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);
      const { error } = await signUpWithEmail(data.email.trim(), data.password, {
        full_name: data.fullName.trim()
      });
      if (error) {
        setFormError(error.message);
      } else {
        setFormSuccess(t('authVerificationEmailSent'));
        resetSignUp();
      }
    } catch {
      setFormError(t('authNetworkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgot = async (data: ForgotFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);
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
    <div className="min-h-dvh lg:h-dvh lg:max-h-dvh flex flex-col lg:flex-row bg-bg text-ink transition-colors font-sans relative">
      <a
        href="#auth-form-card"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-accent text-accent-fg rounded-xl text-xs font-semibold shadow-card"
      >
        {t('authSkipToForm')}
      </a>

      {/* LEFT SHOWCASE PANEL (Desktop Only, 52% width) */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-8 xl:p-10 text-white overflow-hidden select-none bg-surface-2 border-r border-line">
        <div className="absolute inset-0 z-0 bg-[#0D0D0E]">
          <picture>
            <source srcSet="/YDP.webp" type="image/webp" />
            <img
              src="/YDP.jpg"
              alt="Yogeshwari Dairy Products Store"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center opacity-45 grayscale contrast-125"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0E] via-[#0D0D0E]/80 to-[#0D0D0E]/50" />
        </div>

        {/* Top Branding Crest */}
        <div className="relative z-10 flex items-center gap-3.5 bg-surface/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 w-fit shadow-card">
          <div className="w-12 h-12 rounded-full bg-surface p-0.5 shadow-card border border-line flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={ydoLogo}
              alt="Yogeshwari Dairy Logo"
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) target.src = '/YDO_logo.png';
              }}
            />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white leading-tight">
              {t('shopName')}
            </h1>
            <span className="text-[11px] text-white/70 block font-medium">
              {t('shopSubtitle')}
            </span>
          </div>
        </div>

        {/* Bottom Feature Grid */}
        <div className="relative z-10 mt-auto flex flex-col space-y-4 pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/15 text-[11px] font-medium w-fit backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('authErpBadge')}</span>
          </div>

          <h2 className="text-2xl xl:text-3xl font-semibold leading-tight tracking-tight text-white line-clamp-2">
            {t('authHeadline')}
          </h2>

          <p className="text-white/70 text-xs xl:text-sm leading-relaxed line-clamp-2 max-w-xl">
            {t('authDescription')}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white/80 shrink-0" />
                <h4 className="font-semibold text-xs text-white truncate">
                  {t('authFeatureBatchTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mt-1 pl-6">
                {t('authFeatureBatchDesc')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/80 shrink-0" />
                <h4 className="font-semibold text-xs text-white truncate">
                  {t('authFeatureExpiryTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mt-1 pl-6">
                {t('authFeatureExpiryDesc')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee className="w-4 h-4 text-white/80 shrink-0" />
                <h4 className="font-semibold text-xs text-white truncate">
                  {t('authFeatureBillingTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mt-1 pl-6">
                {t('authFeatureBillingDesc')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 shrink-0" />
                <h4 className="font-semibold text-xs text-white truncate">
                  {t('authFeatureCloudTitle')}
                </h4>
              </div>
              <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mt-1 pl-6">
                {t('authFeatureCloudDesc')}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>&copy; {new Date().getFullYear()} {t('authCopyright')}</span>
            <span className="flex items-center gap-1.5 text-white/80 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
              <span>{t('authEnterpriseGrade')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="w-full lg:w-[48%] flex flex-col justify-between h-full bg-bg relative overflow-y-auto lg:overflow-y-hidden">
        {/* Top Controls Bar */}
        <div className="p-4 sm:p-6 pb-2 flex items-center justify-between gap-3 shrink-0">
          <SegmentedControl
            options={[
              { value: 'mr', label: 'मराठी' },
              { value: 'hi', label: 'हिंदी' },
              { value: 'en', label: 'English' },
            ]}
            value={language}
            onChange={(val) => setLanguage(val as any)}
            size="sm"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 p-0 rounded-xl"
            aria-label={t('authToggleTheme')}
            title={t('authToggleTheme')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-ink-2" />
            ) : (
              <Moon className="w-4 h-4 text-ink-2" />
            )}
          </Button>
        </div>

        {/* Center Form Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-4 sm:py-6 my-auto w-full">
          <div
            id="auth-form-card"
            className="w-full max-w-[400px] bg-surface rounded-2xl p-5 sm:p-7 shadow-card border border-line relative overflow-hidden"
          >
            {/* Subtle Watermark */}
            <div 
              aria-hidden="true" 
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
            >
              <img 
                src={ydoLogo} 
                alt="" 
                className="w-64 h-64 object-contain rounded-full opacity-[0.03] grayscale pointer-events-none" 
              />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="mb-5 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-surface p-1 border border-line shadow-card shrink-0 overflow-hidden flex items-center justify-center mb-2.5">
                  <img
                    src={ydoLogo}
                    alt="Yogeshwari Dairy Logo"
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/YDO_logo.png')) target.src = '/YDO_logo.png';
                    }}
                  />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight leading-tight">
                  {t('shopName')}
                </h2>
                <p className="text-xs text-ink-3 mt-1 font-medium">
                  {mode === 'signin' && (language === 'mr' ? 'खात्यात लॉगिन करा' : language === 'hi' ? 'खाते में लॉगिन करें' : 'Sign in to continue')}
                  {mode === 'signup' && (language === 'mr' ? 'नवीन ऑपरेटर नोंदणी' : language === 'hi' ? 'नया ऑपरेटर पंजीकरण' : 'Create new operator account')}
                  {mode === 'forgot' && (language === 'mr' ? 'पासवर्ड रीसेट करा' : language === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset your password')}
                </p>
              </div>

              {/* Mode Switcher */}
              {isRegistrationEnabled && (
                <div className="mb-4">
                  <SegmentedControl
                    className="w-full justify-center grid grid-cols-2"
                    options={[
                      { value: 'signin', label: language === 'mr' ? 'लॉगिन करा' : language === 'hi' ? 'लॉगिन करें' : 'Sign In' },
                      { value: 'signup', label: language === 'mr' ? 'नोंदणी' : language === 'hi' ? 'पंजीकरण' : 'Register' },
                    ]}
                    value={mode === 'forgot' ? 'signin' : mode}
                    onChange={(val) => switchMode(val as any)}
                  />
                </div>
              )}

              {/* Alerts */}
              {formError && (
                <div role="alert" className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div role="status" className="mb-4 p-3 rounded-xl bg-ok/10 border border-ok/20 flex items-start gap-2.5 text-xs text-ok font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Sign In Form */}
              {mode === 'signin' && (
                <form onSubmit={handleSignInSubmit(onSignIn)} className="space-y-3.5" noValidate>
                  <div>
                    <label htmlFor="signin-email" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {t('authEmail')}
                    </label>
                    <Input
                      id="signin-email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoFocus
                      placeholder={t('authEmailPlaceholder')}
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={signInErrors.email?.message}
                      {...registerSignIn('email')}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="signin-password" block text-xs font-medium text-ink-2>
                        {t('authPassword')}
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-ink-3 hover:text-ink transition font-medium"
                      >
                        {t('authForgotPassword')}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('authPasswordPlaceholder')}
                        leftIcon={<Lock className="w-4 h-4" />}
                        error={signInErrors.password?.message}
                        onKeyDown={handleKeyModifier}
                        onKeyUp={handleKeyModifier}
                        {...registerSignIn('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-3 text-ink-3 hover:text-ink transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isCapsLockOn && (
                      <p className="text-[11px] text-warn font-medium mt-1 flex items-center gap-1">
                        <span>⚠️ Caps Lock चालू आहे</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...registerSignIn('rememberMe')}
                        className="rounded border-line text-accent focus:ring-ink/20"
                      />
                      <span className="text-xs text-ink-3">{t('authRememberMe')}</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    className="w-full h-11"
                  >
                    {t('authSignInButton')}
                  </Button>
                </form>
              )}

              {/* Sign Up Form */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-3.5" noValidate>
                  <div>
                    <label htmlFor="signup-name" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {t('authFullName')}
                    </label>
                    <Input
                      id="signup-name"
                      type="text"
                      autoFocus
                      placeholder={t('authFullNamePlaceholder')}
                      leftIcon={<UserIcon className="w-4 h-4" />}
                      error={signUpErrors.fullName?.message}
                      {...registerSignUp('fullName')}
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {t('authEmail')}
                    </label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('authEmailPlaceholder')}
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={signUpErrors.email?.message}
                      {...registerSignUp('email')}
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {t('authPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('authPasswordPlaceholder')}
                        leftIcon={<Lock className="w-4 h-4" />}
                        error={signUpErrors.password?.message}
                        {...registerSignUp('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-3 text-ink-3 hover:text-ink transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-confirm" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {language === 'mr' ? 'पासवर्ड पुन्हा टाका' : language === 'hi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm Password'}
                    </label>
                    <Input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('authPasswordPlaceholder')}
                      leftIcon={<Lock className="w-4 h-4" />}
                      error={signUpErrors.confirmPassword?.message}
                      {...registerSignUp('confirmPassword')}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    className="w-full h-11"
                  >
                    {t('authSignUpButton')}
                  </Button>
                </form>
              )}

              {/* Forgot Password Flow */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-3.5" noValidate>
                  <div>
                    <label htmlFor="forgot-email" className="block text-xs font-medium text-ink-2 mb-1.5">
                      {t('authEmail')}
                    </label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoFocus
                      placeholder={t('authEmailPlaceholder')}
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={forgotErrors.email?.message}
                      {...registerForgot('email')}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    className="w-full h-11"
                  >
                    {t('authSendResetLink')}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="text-xs text-ink-3 hover:text-ink transition font-medium"
                    >
                      &larr; {t('authBackToSignIn')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-ink-3 shrink-0">
          <p>{t('authFooterHelp')}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
