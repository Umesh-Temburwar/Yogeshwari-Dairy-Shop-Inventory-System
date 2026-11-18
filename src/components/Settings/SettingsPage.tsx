import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  KeyRound,
  Lock,
  Globe,
  Sun,
  Moon,
  Camera,
  Smartphone,
  Download,
  RefreshCw,
  UserPlus,
  Activity,
  Power,
  Loader2,
  LogOut
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isMobileDevice, requestMotionPermission } from '../../hooks/useShakeDetector';
import {
  isRegistrationAllowedSync,
  setRegistrationSetting,
  subscribeToRegistrationSetting,
  syncRegistrationSettingFromCloud
} from '../../lib/registrationConfig';
import {
  isAuditStreamEnabledSync,
  setAuditStreamEnabled,
  subscribeToAuditStreamSetting
} from '../../lib/auditStreamConfig';
import { CompactPageHeader } from '../Common/CompactPageHeader';

interface SettingsPageProps {
  onOpenChangePasscode: () => void;
  onOpenPhotoDatabase: () => void;
  onOpenImageHealth?: () => void;
  onOpenAppDownload: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onOpenChangePasscode,
  onOpenPhotoDatabase,
  onOpenImageHealth,
  onOpenAppDownload
}) => {
  const {
    refreshData,
    isSyncing,
    triggerGlobalBillingScanner
  } = useStore();
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, lockSecurity, signOut } = useAuth();

  // Security Controls (Registration & Audit Stream)
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(() => isRegistrationAllowedSync());
  const [isUpdatingReg, setIsUpdatingReg] = useState(false);
  const [regFeedback, setRegFeedback] = useState<string | null>(null);
  const [isAuditStreamEnabled, setIsAuditStreamEnabledState] = useState<boolean>(() => isAuditStreamEnabledSync());

  // Shake-to-Scan setting
  const [shakeToScanEnabled, setShakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);

  useEffect(() => {
    syncRegistrationSettingFromCloud().then(setIsRegistrationAllowed).catch(() => {});
    const unsubReg = subscribeToRegistrationSetting(setIsRegistrationAllowed);
    const unsubAudit = subscribeToAuditStreamSetting(setIsAuditStreamEnabledState);
    return () => {
      unsubReg();
      unsubAudit();
    };
  }, []);

  const languagesList: { code: Language; label: string }[] = [
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'en', label: 'English' }
  ];

  const handleToggleRegistration = async () => {
    if (role !== 'Owner' || isUpdatingReg) return;
    setIsUpdatingReg(true);
    setRegFeedback(null);
    const nextVal = !isRegistrationAllowed;
    try {
      const res = await setRegistrationSetting(
        nextVal,
        role,
        user?.email || 'yogeshwaridairy9896@gmail.com',
        user?.user_metadata?.full_name || 'निखिल सखारे (दुकान मालक)'
      );
      if (res.success) {
        setIsRegistrationAllowed(nextVal);
        setRegFeedback(
          nextVal
            ? language === 'mr'
              ? '✓ नवीन ऑपरेटर नोंदणी सुरू केली'
              : language === 'hi'
              ? '✓ नया ऑपरेटर पंजीकरण चालू किया गया'
              : '✓ Operator registration enabled'
            : language === 'mr'
            ? '✓ नवीन ऑपरेटर नोंदणी बंद केली'
            : language === 'hi'
            ? '✓ नया ऑपरेटर पंजीकरण बंद किया गया'
            : '✓ Operator registration disabled'
        );
      } else {
        setRegFeedback(res.error || 'Error updating setting');
      }
    } finally {
      setIsUpdatingReg(false);
    }
  };

  const handleToggleAuditStream = () => {
    if (role !== 'Owner') return;
    const nextVal = !isAuditStreamEnabled;
    setAuditStreamEnabled(nextVal);
    setIsAuditStreamEnabledState(nextVal);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-3.5 pb-28 lg:pb-8">
      {/* Compact Page Header */}
      <CompactPageHeader
        icon={<SettingsIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        title={language === 'mr' ? 'सेटिंग्ज व सुरक्षा' : language === 'hi' ? 'सेटिंग्स व सुरक्षा' : 'Settings & Security'}
        subtitle={
          language === 'mr'
            ? 'मास्टर पासवर्ड, थीम, भाषा, फोटो डेटाबेस आणि क्लाउड सिंक नियंत्रणे'
            : language === 'hi'
              ? 'मास्टर पासवर्ड, थीम, भाषा, फोटो डेटाबेस और क्लाउड सिंक नियंत्रण'
              : 'Manage master passcode, theme, language, photo database, and cloud sync'
        }
        primaryAction={{
          label: isSyncing
            ? language === 'mr' ? 'सिंक...' : 'सिंक...'
            : language === 'mr' ? 'सिंक' : language === 'hi' ? 'सिंक' : 'Sync',
          icon: <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />,
          onClick: () => {
            if (!isSyncing) refreshData();
          },
          ariaLabel: 'Sync Database',
        }}
      />

      {/* Main 2-Column Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* SECTION 1: SECURITY & ACCESS CONTROL */}
        <section className="bg-white dark:bg-[#131F1B] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#24352F]">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'mr' ? 'सुरक्षा व काउंटर लॉक' : language === 'hi' ? 'सुरक्षा व काउंटर लॉक' : 'Security & Counter Access'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? '८-अंकी मास्टर पासवर्ड आणि प्रवेश नियंत्रण' : language === 'hi' ? '८-अंकीय मास्टर पासवर्ड और प्रवेश नियंत्रण' : '8-digit master passcode & operator controls'}
              </p>
            </div>
          </div>

          {/* Change Master Passcode */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {language === 'mr' ? 'मास्टर सुरक्षा पासवर्ड बदला' : language === 'hi' ? 'मास्टर सुरक्षा पासवर्ड बदलें' : 'Change Master Passcode'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr'
                    ? 'सध्याचा ८-अंकी पासवर्ड टाकल्यानंतरच बदलता येतो'
                    : language === 'hi'
                    ? 'वर्तमान ८-अंकीय पासवर्ड सत्यापित करने के बाद ही बदलें'
                    : 'Requires verifying your current 8-digit passcode'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenChangePasscode}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            >
              {language === 'mr' ? 'बदला' : language === 'hi' ? 'बदलें' : 'Change'}
            </button>
          </div>

          {/* Lock Counter & Sign Out Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => lockSecurity()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold transition cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>{language === 'mr' ? 'काउंटर लॉक करा' : language === 'hi' ? 'काउंटर लॉक करें' : 'Lock Counter'}</span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{language === 'mr' ? 'लॉग आउट' : language === 'hi' ? 'लॉग आउट' : 'Logout'}</span>
            </button>
          </div>

          {/* Operator Registration Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-[#E7F0EC]">
                  {language === 'mr' ? 'नवीन ऑपरेटर नोंदणी' : language === 'hi' ? 'नया ऑपरेटर पंजीकरण' : 'New Operator Registration'}
                </span>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                  isRegistrationAllowed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                }`}
              >
                {isRegistrationAllowed ? 'ON' : 'OFF'}
              </span>
            </div>

            {role === 'Owner' ? (
              <button
                type="button"
                disabled={isUpdatingReg}
                onClick={handleToggleRegistration}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isRegistrationAllowed
                    ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isUpdatingReg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isRegistrationAllowed
                    ? language === 'mr' ? 'नोंदणी बंद करा' : language === 'hi' ? 'पंजीकरण बंद करें' : 'Disable Registration'
                    : language === 'mr' ? 'नोंदणी चालू करा' : language === 'hi' ? 'पंजीकरण चालू करें' : 'Enable Registration'}
                </span>
              </button>
            ) : (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {language === 'mr' ? 'फक्त दुकान मालक बदलू शकतात' : language === 'hi' ? 'केवल दुकान मालिक बदल सकते हैं' : 'Only Shop Owner can change this setting'}
              </p>
            )}

            {regFeedback && (
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{regFeedback}</p>
            )}
          </div>

          {/* Live Audit Stream Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-[#E7F0EC] block truncate">
                  {language === 'mr' ? 'थेट तपासणी नोंदवही' : language === 'hi' ? 'लाइव ऑडिट रजिस्टर' : 'Live Audit Stream'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {isAuditStreamEnabled ? 'Active (ON)' : 'Paused (OFF)'}
                </span>
              </div>
            </div>
            {role === 'Owner' && (
              <button
                type="button"
                onClick={handleToggleAuditStream}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isAuditStreamEnabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isAuditStreamEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>
        </section>

        {/* SECTION 2: APPEARANCE, LANGUAGE & POS TOOLS */}
        <section className="bg-white dark:bg-[#131F1B] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#24352F]">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'mr' ? 'भाषा, थीम व पीओएस साधने' : language === 'hi' ? 'भाषा, थीम व पीओएस टूल्स' : 'Language, Theme & POS Tools'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'डिस्प्ले मोड, फोटो डेटाबेस आणि स्कॅनर सेटिंग्ज' : language === 'hi' ? 'डिस्प्ले मोड, फोटो डेटाबेस और स्कैनर सेटिंग्स' : 'Display preferences, photo catalog & mobile scanner'}
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block">
              {language === 'mr' ? 'अ‍ॅपची भाषा (Language)' : language === 'hi' ? 'ऐप की भाषा (Language)' : 'App Language'}
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200/80 dark:border-[#24352F]">
              {languagesList.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200/70 dark:ring-[#24352F]'
                        : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Mode Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {resolvedTheme === 'dark' ? (
                <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {language === 'mr' ? 'थीम मोड (Theme)' : language === 'hi' ? 'थीम मोड (Theme)' : 'Display Theme'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {resolvedTheme === 'dark'
                    ? language === 'mr' ? 'सध्या डार्क मोड सक्रिय आहे' : language === 'hi' ? 'वर्तमान में डार्क मोड सक्रिय है' : 'Currently using Dark Mode'
                    : language === 'mr' ? 'सध्या लाइट मोड सक्रिय आहे' : language === 'hi' ? 'वर्तमान में लाइट मोड सक्रिय है' : 'Currently using Light Mode'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#22352E] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-white transition cursor-pointer shrink-0"
            >
              {resolvedTheme === 'dark'
                ? language === 'mr' ? 'लाइट करा ☀️' : language === 'hi' ? 'लाइट करें ☀️' : 'Light ☀️'
                : language === 'mr' ? 'डार्क करा 🌙' : language === 'hi' ? 'डार्क करें 🌙' : 'Dark 🌙'}
            </button>
          </div>

          {/* Photo Database Manager */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {language === 'mr' ? 'प्रॉडक्ट फोटो डेटाबेस' : language === 'hi' ? 'प्रोडक्ट फोटो डेटाबेस' : 'Product Photo Database'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'अधिकृत इमेज URL तपासा व अपडेट करा' : language === 'hi' ? 'आधिकारिक इमेज URL जांचें और अपडेट करें' : 'Audit & update official product packshots'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPhotoDatabase}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
            >
              {language === 'mr' ? 'उघडा' : language === 'hi' ? 'खोलें' : 'Open'}
            </button>
          </div>

          {/* Admin Image Health Audit Screen */}
          {onOpenImageHealth && (role === 'Owner' || role === 'Admin') && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {language === 'mr' ? 'इमेज हेल्थ तपासणी (Image Health)' : language === 'hi' ? 'इमेज हेल्थ जांच (Image Health)' : 'Product Image Health'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr'
                      ? 'तुटलेले, नसलेले किंवा नॉन-स्क्वेअर फोटो शोधा व दुरुस्त करा'
                      : language === 'hi'
                      ? 'टूटे, गायब या नॉन-स्क्वायर फोटो खोजें व ठीक करें'
                      : 'Fix missing, broken, or non-square product photos'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenImageHealth}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
              >
                {language === 'mr' ? 'तपासा' : language === 'hi' ? 'जांचें' : 'Inspect'}
              </button>
            </div>
          )}

          {/* Shake-to-Open Billing Scanner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {language === 'mr' ? 'शेक-टू-बिलिंग स्कॅनर' : language === 'hi' ? 'शेक-टू-बिलिंग स्कैनर' : 'Shake to Open Scanner'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {shakeToScanEnabled
                      ? isMobileDevice()
                        ? language === 'mr'
                          ? 'चालू आहे — फोन हलवताच स्कॅनर उघडेल'
                          : language === 'hi'
                          ? 'चालू है — फोन हिलाने पर स्कैनर खुलेगा'
                          : 'Active — shake phone to open scanner'
                        : language === 'mr'
                        ? 'मोबाईलवर चालू आहे'
                        : language === 'hi'
                        ? 'मोबाइल पर चालू है'
                        : 'Enabled on mobile devices'
                      : language === 'mr'
                      ? 'बंद आहे — फोन शेक निष्क्रिय'
                      : language === 'hi'
                      ? 'बंद है — फोन शेक निष्क्रिय'
                      : 'Turned OFF — phone shake disabled'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-pressed={shakeToScanEnabled}
                onClick={async () => {
                  const nextEnabled = !shakeToScanEnabled;
                  setShakeToScanEnabled(nextEnabled);
                  if (nextEnabled) {
                    try {
                      await requestMotionPermission();
                    } catch {
                      // Non-blocking on Android Chrome
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                  shakeToScanEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {shakeToScanEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate([80]); } catch {}
                  }
                  triggerGlobalBillingScanner();
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
              >
                {language === 'mr' ? 'शेक टेस्ट करा' : language === 'hi' ? 'शेक टेस्ट करें' : 'Test Shake Scanner'}
              </button>
              <button
                type="button"
                onClick={onOpenAppDownload}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'ॲप इन्स्टॉल' : language === 'hi' ? 'ऐप इंस्टॉल' : 'Install App'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
