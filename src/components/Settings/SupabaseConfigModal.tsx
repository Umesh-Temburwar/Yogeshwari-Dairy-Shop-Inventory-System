import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { 
  Database, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isMobileDevice, requestMotionPermission } from '../../hooks/useShakeDetector';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChangePasscode?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose, onOpenChangePasscode }) => {
  const { isSupabaseConnected, syncWithSupabase, resetToSampleData, triggerGlobalBillingScanner } = useStore();
  const { tr } = useLanguage();

  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [testingStatus, setTestingStatus] = useState<{ testing: boolean; message?: string; success?: boolean }>({
    testing: false
  });
  const [copiedSql, setCopiedSql] = useState(false);
  const [shakeToScanEnabled, setShakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingStatus({ testing: true });

    const result = await testSupabaseConnection(url.trim(), key.trim());
    if (result.success) {
      saveSupabaseConfig(url.trim(), key.trim());
      setTestingStatus({
        testing: false,
        success: true,
        message: tr('Successfully connected to Supabase!', 'Supabase से सफलतापूर्वक जुड़ गया!', 'Supabase शी यशस्वीरित्या जोडले गेले!')
      });
      await syncWithSupabase();
    } else {
      setTestingStatus({ testing: false, success: false, message: result.message });
    }
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setKey('');
    setTestingStatus({ testing: false, success: false, message: 'Disconnected. App is running in Local Storage mode.' });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleCopySqlSchema = () => {
    const sqlText = `-- YOGESHWARI DAIRY SHOP SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    hindi_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_stock_alert NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Counter Customer',
    customer_phone VARCHAR(20),
    total_amount NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    cash_amount NUMERIC(10, 2) DEFAULT 0.00,
    online_amount NUMERIC(10, 2) DEFAULT 0.00,
    udhar_amount NUMERIC(10, 2) DEFAULT 0.00,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS damage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_loss_amount NUMERIC(10, 2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS udhar_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    total_credit NUMERIC(10, 2) DEFAULT 0.00,
    total_paid NUMERIC(10, 2) DEFAULT 0.00,
    current_balance NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_capital_investment BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-transparent dark:border-[#24352F] rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92dvh] overflow-y-auto overscroll-contain">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-[#E7F0EC] text-base">
                {tr('Supabase Cloud Database Settings', 'Supabase डेटाबेस सेटिंग्स (Cloud Database)', 'Supabase डेटाबेस सेटिंग्ज (Cloud Database)')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
                {tr('Cloud sync or offline local storage mode', 'क्लाउड सिंक अथवा ऑफलाइन लोकल स्टोरेज मोड', 'क्लाउड सिंक किंवा ऑफलाइन लोकल स्टोरेज मोड')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isSupabaseConnected 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300' 
            : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#8FA69C]'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {isSupabaseConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {isSupabaseConnected
                  ? tr('Cloud Database Connected (Supabase)', 'क्लाउड डेटाबेस सक्रिय (Supabase Connected)', 'क्लाउड डेटाबेस सक्रिय (Supabase Connected)')
                  : tr('Offline Local Storage Active', 'ऑफलाइन लोकल स्टोरेज सक्रिय (Offline Mode)', 'ऑफलाइन लोकल स्टोरेज सक्रिय (Offline Mode)')}
              </div>
              <div className="text-[11px] font-normal text-slate-500 dark:text-[#8FA69C]">
                {isSupabaseConnected
                  ? tr('All your shop data is securely synced to Supabase PostgreSQL.', 'आपका सारा डेटा सीधे Supabase PostgreSQL में सुरक्षित हो रहा है', 'तुमचा सर्व डेटा थेट Supabase PostgreSQL मध्ये सुरक्षित होत आहे')
                  : tr('Data is saved in your browser. Connect Supabase to auto-sync.', 'डेटा आपके ब्राउज़र में सुरक्षित है। Supabase जोड़ते ही ऑटो-सिंक हो जाएगा।', 'डेटा ब्राउझरमध्ये सुरक्षित आहे. Supabase जोडताच ऑटो-सिंक होईल.')}
              </div>
            </div>
          </div>
        </div>

        {/* Supabase URL & Key Form */}
        <form onSubmit={handleTestAndSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {testingStatus.message && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              testingStatus.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {testingStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testingStatus.message}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={testingStatus.testing}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              {testingStatus.testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{tr('Test & Save Connection', 'कनेक्शन जांचें व सुरक्षित करें', 'कनेक्शन तपासा व सेव्ह करा')}</span>
            </button>

            {isSupabaseConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/40"
              >
                {tr('Disconnect', 'डिस्कनेक्ट', 'डिस्कनेक्ट')}
              </button>
            )}
          </div>
        </form>

        {/* 1-Click SQL Copy Section */}
        <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#E7F0EC]">
              <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr('Supabase SQL Setup Script', 'Supabase SQL सेटअप स्क्रिप्ट', 'Supabase SQL सेटअप स्क्रिप्ट')}</span>
            </div>
            <button
              onClick={handleCopySqlSchema}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#24352F]"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>
                {copiedSql
                  ? tr('Copied!', 'कॉपी हो गया!', 'कॉपी झाले!')
                  : tr('1-Click Copy SQL', '1-क्लिक SQL कॉपी करें', '1-क्लिक SQL कॉपी करा')}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {tr(
              'Paste this in Supabase Dashboard -> SQL Editor and click "Run".',
              'इसे Supabase Dashboard में SQL Editor में पेस्ट करके "Run" दबाएं।',
              'हे Supabase Dashboard मधील SQL Editor मध्ये पेस्ट करून "Run" दाबा.'
            )}
          </p>
        </div>

        {/* Master Security Passcode Change Section */}
        {onOpenChangePasscode && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#E7F0EC] truncate">
                  {tr('Change Master Passcode', 'मास्टर सुरक्षा पासवर्ड बदलें', 'मास्टर सुरक्षा पासवर्ड बदला')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {tr('Verify current 8-digit passcode and set a new one', 'वर्तमान 8-अंकीय पासवर्ड सत्यापित करके नया पासवर्ड सेट करें', 'वर्तमान ८-अंकी पासवर्ड सत्यापित करून नवीन पासवर्ड सेट करा')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChangePasscode();
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-xs transition active:scale-95 cursor-pointer"
            >
              {tr('Change', 'पासवर्ड बदलें', 'पासवर्ड बदला')}
            </button>
          </div>
        )}

        {/* Shake to Open Billing Scanner Setting */}
        <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-[#E7F0EC]">
                  {tr('Shake to Open Billing Scanner', 'शेक-टू-बिलिंग स्कैनर', 'शेक-टू-बिलिंग स्कॅनर')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {tr(
                    'Shake phone once from any screen to jump straight to Billing Barcode Scanner',
                    'किसी भी पेज से मोबाइल 1 बार हिलाते ही बिलिंग बारकोड स्कैनर खुल जाएगा',
                    'कोणत्याही पेजवरून मोबाईल १ वेळा हलवताच थेट बिलिंग बारकोड स्कॅनर उघडेल'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await requestMotionPermission();
                setShakeToScanEnabled(!shakeToScanEnabled);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs cursor-pointer ${
                shakeToScanEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {shakeToScanEnabled ? tr('ON', 'चालू (ON)', 'चालू (ON)') : tr('OFF', 'बंद (OFF)', 'बंद (OFF)')}
            </button>
          </div>

          {/* Test Shake Button & Sensor Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-[#24352F]">
            <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] bg-white dark:bg-[#131F1B] px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-[#24352F] flex items-center justify-between gap-2">
              <span>
                {isMobileDevice()
                  ? tr('✓ Mobile motion sensor active', '✓ मोबाइल मोशन सेंसर सक्रिय है', '✓ मोबाईल मोशन सेन्सर सक्रिय आहे')
                  : tr('ℹ️ Inactive on desktop; auto-active on mobile', 'ℹ️ डेस्कटॉप पर बंद; मोबाइल पर स्वतः सक्रिय', 'ℹ️ डेस्कटॉपवर बंद; मोबाईलवर स्वयंचलित सक्रिय')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                {tr('Active', 'सक्रिय', 'सक्रिय')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate([80]); } catch {}
                }
                triggerGlobalBillingScanner();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{tr('Test Shake', 'शेक टेस्ट करें', 'शेक टेस्ट करा')}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-[#8FA69C] leading-normal">
            💡{' '}
            {tr(
              'How to use: Gently flick your phone once from any screen to open the Billing Counter barcode scanner immediately.',
              'उपयोग विधि: किसी भी स्क्रीन से फोन को 1 बार हल्के से हिलाएं, सीधे बिलिंग काउंटर बारकोड स्कैनर खुल जाएगा।',
              'वापरण्याची पद्धत: कोणत्याही पेजवरून फोन १ वेळा हलवा, थेट बिलिंग काउंटर बारकोड स्कॅनर सुरू होईल.'
            )}
          </p>
        </div>

        {/* Demo Data Reset */}
        <div className="border-t border-slate-100 dark:border-[#24352F] pt-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-[#E7F0EC] block">
              {tr('Reset Sample Dairy Data', 'डेरी सैंपल डेटा रिसेट', 'डेअरी सॅम्पल डेटा रीसेट')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] block">
              {tr('Reload sample milk, paneer, expense, and sales data', 'ताज़ा दूध, पनीर, खर्च और बिक्री डेटा दोबारा लोड करें', 'ताजे दूध, पनीर, खर्च आणि विक्री डेटा पुन्हा लोड करा')}
            </span>
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  tr(
                    'Do you want to reload sample dairy data?',
                    'क्या आप सैंपल डेरी डेटा दोबारा लोड करना चाहते हैं?',
                    'तुम्हाला सॅम्पल डेअरी डेटा पुन्हा लोड करायचा आहे का?'
                  )
                )
              ) {
                resetToSampleData();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{tr('Reset Data', 'डेटा रिसेट करें', 'डेटा रीसेट करा')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

