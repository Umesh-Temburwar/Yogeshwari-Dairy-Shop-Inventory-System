import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  Activity,
  Globe,
  Sun,
  Moon,
  ScanLine,
  Download,
  Image as ImageIcon,
  HeartPulse,
  Lock,
  LogOut,
  RefreshCw
} from 'lucide-react';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
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
import {
  SettingSection,
  SettingRow,
  ToggleSwitch,
  SegmentedControl,
  SegmentedOption
} from './SettingsPrimitives';

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
    products,
    refreshData,
    isSyncing,
    triggerGlobalBillingScanner
  } = useStore();
  const { language, setLanguage, tr } = useLanguage();
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

  const languagesList: SegmentedOption<Language>[] = [
    { value: 'mr', label: 'मराठी' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'en', label: 'English' }
  ];

  // Count products missing or with invalid image URLs from existing store state (zero extra queries)
  const imageIssueCount = useMemo(() => {
    return products.reduce((count, prod) => {
      const url = (prod.image_url || '').trim();
      const hasValidUrl = /^https?:\/\//i.test(url);
      return hasValidUrl ? count : count + 1;
    }, 0);
  }, [products]);

  const currentUserName =
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name
          : 'Nikhil Sakhare');

  const roleLabel =
    role === 'Owner'
      ? language === 'mr'
        ? 'दुकान मालक (Owner)'
        : language === 'hi'
        ? 'दुकान मालिक (Owner)'
        : 'Owner'
      : language === 'mr'
      ? 'काउंटर ऑपरेटर (Admin)'
      : language === 'hi'
      ? 'काउंटर ऑपरेटर (Admin)'
      : 'Operator';

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
        typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name
          ? user.user_metadata.full_name
          : 'निखिल सखारे (दुकान मालक)'
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
        setRegFeedback(
          res.error ||
            tr('Error updating setting', 'सेटिंग अपडेट करने में त्रुटि', 'सेटिंग अपडेट करताना त्रुटी आली')
        );
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

  const handleToggleShakeScanner = async () => {
    const nextEnabled = !shakeToScanEnabled;
    setShakeToScanEnabled(nextEnabled);
    if (nextEnabled) {
      try {
        await requestMotionPermission();
      } catch {
        // Non-blocking on Android Chrome
      }
    }
  };

  const handleTestShakeScanner = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80]);
      } catch {
        // Ignore unsupported vibration API errors
      }
    }
    triggerGlobalBillingScanner();
  };

  const registrationSubtitle = regFeedback
    ? regFeedback
    : role !== 'Owner'
    ? language === 'mr'
      ? 'फक्त दुकान मालक बदलू शकतात'
      : language === 'hi'
      ? 'केवल दुकान मालिक बदल सकते हैं'
      : 'Only Shop Owner can change this'
    : isRegistrationAllowed
    ? tr('Enabled (ON)', 'चालू (ON)', 'सुरू (ON)')
    : tr('Disabled (OFF)', 'बंद (OFF)', 'बंद (OFF)');

  const shakeSubtitle = shakeToScanEnabled
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
    : 'Turned OFF — phone shake disabled';

  return (
    <div className="-mx-2.5 -mt-2.5 sm:-mx-6 sm:-mt-6 min-h-full bg-slate-50 dark:bg-[#0B1210]">
      {/* Sticky Page Header Bar with Sync Button */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#24352F]">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              {language === 'mr'
                ? 'सेटिंग्ज व सुरक्षा'
                : language === 'hi'
                ? 'सेटिंग्स व सुरक्षा'
                : 'Settings & Security'}
            </h1>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              if (!isSyncing) refreshData();
            }}
            aria-label="Sync Database"
            className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? tr('Syncing...', 'सिंक हो रहा है...', 'सिंक...')
                : tr('Sync', 'सिंक', 'सिंक')}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10">
        {/* Compact Profile Summary Card + Quick Counter Actions */}
        <section
          aria-label={language === 'mr' ? 'खाते सारांश' : language === 'hi' ? 'प्रोफ़ाइल सारांश' : 'Profile Summary'}
          className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3.5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
              <img
                src={nikhilAvatar}
                alt={currentUserName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
                {currentUserName}
              </div>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                  {roleLabel}
                </span>
                {user?.email && (
                  <span className="text-xs text-slate-500 dark:text-[#8FA69C] truncate">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lock Counter & Logout Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => lockSecurity()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {language === 'mr'
                  ? 'काउंटर लॉक करा'
                  : language === 'hi'
                  ? 'काउंटर लॉक करें'
                  : 'Lock Counter'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-red-300 dark:border-rose-800/70 bg-red-50/60 hover:bg-red-100/80 dark:bg-rose-950/25 dark:hover:bg-rose-950/50 text-red-700 dark:text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {language === 'mr' ? 'लॉग आउट' : language === 'hi' ? 'लॉग आउट' : 'Logout'}
              </span>
            </button>
          </div>
        </section>

        {/* SECTION 1: SECURITY */}
        <SettingSection
          title={
            language === 'mr' ? 'सुरक्षा' : language === 'hi' ? 'सुरक्षा' : 'SECURITY'
          }
        >
          <SettingRow
            icon={<KeyRound className="w-5 h-5" />}
            tone="emerald"
            title={
              language === 'mr'
                ? 'मास्टर सुरक्षा पासवर्ड बदला'
                : language === 'hi'
                ? 'मास्टर सुरक्षा पासवर्ड बदलें'
                : 'Change Master Passcode'
            }
            subtitle={
              language === 'mr'
                ? '८-अंकी पासवर्ड'
                : language === 'hi'
                ? '8-अंकीय पासवर्ड'
                : '8-digit passcode'
            }
            onClick={onOpenChangePasscode}
            showChevron
          />

          <SettingRow
            icon={<UserPlus className="w-5 h-5" />}
            tone="emerald"
            title={
              language === 'mr'
                ? 'नवीन ऑपरेटर नोंदणी'
                : language === 'hi'
                ? 'नया ऑपरेटर पंजीकरण'
                : 'New Operator Registration'
            }
            subtitle={registrationSubtitle}
            onClick={role === 'Owner' && !isUpdatingReg ? () => void handleToggleRegistration() : undefined}
            disabled={role !== 'Owner' || isUpdatingReg}
            rightContent={
              <ToggleSwitch
                checked={isRegistrationAllowed}
                onChange={() => void handleToggleRegistration()}
                disabled={role !== 'Owner' || isUpdatingReg}
                ariaLabel={
                  language === 'mr'
                    ? 'नवीन ऑपरेटर नोंदणी'
                    : language === 'hi'
                    ? 'नया ऑपरेटर पंजीकरण'
                    : 'New Operator Registration'
                }
              />
            }
          />

          <SettingRow
            icon={<Activity className="w-5 h-5" />}
            tone="amber"
            title={
              language === 'mr'
                ? 'थेट तपासणी नोंदवही'
                : language === 'hi'
                ? 'लाइव ऑडिट रजिस्टर'
                : 'Live Audit Stream'
            }
            subtitle={
              isAuditStreamEnabled
                ? tr('Active (ON)', 'सक्रिय (ON)', 'सक्रिय (ON)')
                : tr('Paused (OFF)', 'बंद (OFF)', 'बंद (OFF)')
            }
            onClick={role === 'Owner' ? handleToggleAuditStream : undefined}
            disabled={role !== 'Owner'}
            rightContent={
              <ToggleSwitch
                checked={isAuditStreamEnabled}
                onChange={handleToggleAuditStream}
                disabled={role !== 'Owner'}
                ariaLabel={
                  language === 'mr'
                    ? 'थेट तपासणी नोंदवही'
                    : language === 'hi'
                    ? 'लाइव ऑडिट रजिस्टर'
                    : 'Live Audit Stream'
                }
              />
            }
          />
        </SettingSection>

        {/* SECTION 2: PREFERENCES */}
        <SettingSection
          title={
            language === 'mr' ? 'प्राधान्ये' : language === 'hi' ? 'प्राथमिकताएं' : 'PREFERENCES'
          }
        >
          {/* App Language Row with Segmented Control Below Label */}
          <div className="px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug truncate">
                  {language === 'mr'
                    ? 'अ‍ॅपची भाषा (Language)'
                    : language === 'hi'
                    ? 'ऐप की भाषा (Language)'
                    : 'App Language'}
                </div>
              </div>
            </div>

            <SegmentedControl
              options={languagesList}
              value={language}
              onChange={setLanguage}
              ariaLabel={
                language === 'mr'
                  ? 'अ‍ॅपची भाषा निवडा'
                  : language === 'hi'
                  ? 'ऐप की भाषा चुनें'
                  : 'Select App Language'
              }
            />
          </div>

          {/* Display Theme Toggle Row */}
          <SettingRow
            icon={
              resolvedTheme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )
            }
            tone={resolvedTheme === 'dark' ? 'emerald' : 'amber'}
            title={
              language === 'mr'
                ? 'थीम मोड (Theme)'
                : language === 'hi'
                ? 'थीम मोड (Theme)'
                : 'Display Theme'
            }
            subtitle={
              resolvedTheme === 'dark'
                ? language === 'mr'
                  ? 'सध्या डार्क मोड सक्रिय आहे'
                  : language === 'hi'
                  ? 'वर्तमान में डार्क मोड सक्रिय है'
                  : 'Currently using Dark Mode'
                : language === 'mr'
                ? 'सध्या लाइट मोड सक्रिय आहे'
                : language === 'hi'
                ? 'वर्तमान में लाइट मोड सक्रिय है'
                : 'Currently using Light Mode'
            }
            onClick={toggleTheme}
            rightContent={
              <ToggleSwitch
                checked={resolvedTheme === 'dark'}
                onChange={toggleTheme}
                ariaLabel={
                  language === 'mr'
                    ? 'डार्क मोड टॉगल करा'
                    : language === 'hi'
                    ? 'डार्क मोड टॉगल करें'
                    : 'Toggle Display Theme'
                }
              />
            }
          />
        </SettingSection>

        {/* SECTION 3: POS TOOLS */}
        <SettingSection
          title={
            language === 'mr' ? 'पीओएस साधने' : language === 'hi' ? 'पीओएस टूल्स' : 'POS TOOLS'
          }
        >
          <SettingRow
            icon={<ScanLine className="w-5 h-5" />}
            tone="emerald"
            title={
              language === 'mr'
                ? 'शेक-टू-बिलिंग स्कॅनर'
                : language === 'hi'
                ? 'शेक-टू-बिलिंग स्कैनर'
                : 'Shake to Open Scanner'
            }
            subtitle={shakeSubtitle}
            onClick={() => void handleToggleShakeScanner()}
            rightContent={
              <ToggleSwitch
                checked={shakeToScanEnabled}
                onChange={() => void handleToggleShakeScanner()}
                ariaLabel={
                  language === 'mr'
                    ? 'शेक-टू-बिलिंग स्कॅनर'
                    : language === 'hi'
                    ? 'शेक-टू-बिलिंग स्कैनर'
                    : 'Shake to Open Scanner'
                }
              />
            }
          />

          <SettingRow
            icon={<ScanLine className="w-5 h-5" />}
            tone="amber"
            title={
              language === 'mr'
                ? 'शेक टेस्ट करा'
                : language === 'hi'
                ? 'शेक टेस्ट करें'
                : 'Test Shake Scanner'
            }
            onClick={handleTestShakeScanner}
            showChevron
          />

          <SettingRow
            icon={<Download className="w-5 h-5" />}
            tone="emerald"
            title={
              language === 'mr'
                ? 'ॲप इन्स्टॉल'
                : language === 'hi'
                ? 'ऐप इंस्टॉल'
                : 'Install App'
            }
            onClick={onOpenAppDownload}
            showChevron
          />
        </SettingSection>

        {/* SECTION 4: DATA & PHOTOS */}
        <SettingSection
          title={
            language === 'mr' ? 'डेटा व फोटो' : language === 'hi' ? 'डेटा व फोटो' : 'DATA & PHOTOS'
          }
        >
          <SettingRow
            icon={<ImageIcon className="w-5 h-5" />}
            tone="emerald"
            title={
              language === 'mr'
                ? 'प्रॉडक्ट फोटो डेटाबेस'
                : language === 'hi'
                ? 'प्रोडक्ट फोटो डेटाबेस'
                : 'Product Photo Database'
            }
            subtitle={
              language === 'mr'
                ? 'अधिकृत इमेज URL तपासा व अपडेट करा'
                : language === 'hi'
                ? 'आधिकारिक इमेज URL जांचें और अपडेट करें'
                : 'Audit & update packshots'
            }
            onClick={onOpenPhotoDatabase}
            showChevron
          />

          {onOpenImageHealth && (role === 'Owner' || role === 'Admin') && (
            <SettingRow
              icon={<HeartPulse className="w-5 h-5" />}
              tone={imageIssueCount > 0 ? 'amber' : 'emerald'}
              title={
                language === 'mr'
                  ? 'इमेज हेल्थ तपासणी (Image Health)'
                  : language === 'hi'
                  ? 'इमेज हेल्थ जांच (Image Health)'
                  : 'Product Image Health'
              }
              subtitle={
                language === 'mr'
                  ? 'तुटलेले, नसलेले किंवा नॉन-स्क्वेअर फोटो शोधा व दुरुस्त करा'
                  : language === 'hi'
                  ? 'टूटे, गायब या नॉन-स्क्वायर फोटो खोजें व ठीक करें'
                  : 'Fix missing, broken, or non-square product photos'
              }
              onClick={onOpenImageHealth}
              badgeCount={imageIssueCount}
              showChevron
            />
          )}
        </SettingSection>
      </div>
    </div>
  );
};
