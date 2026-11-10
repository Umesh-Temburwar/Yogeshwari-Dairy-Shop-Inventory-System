import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
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
  FileCode
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { isSupabaseConnected, syncWithSupabase, resetToSampleData } = useStore();

  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [testingStatus, setTestingStatus] = useState<{ testing: boolean; message?: string; success?: boolean }>({
    testing: false
  });
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingStatus({ testing: true });

    const result = await testSupabaseConnection(url.trim(), key.trim());
    if (result.success) {
      saveSupabaseConfig(url.trim(), key.trim());
      setTestingStatus({ testing: false, success: true, message: 'Supabase से सफलतापूर्वक जुड़ गया!' });
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Supabase डेटाबेस सेटिंग्स (Cloud Database)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                क्लाउड सिंक अथवा ऑफलाइन लोकल स्टोरेज मोड
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isSupabaseConnected 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {isSupabaseConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <div className="font-bold">
                {isSupabaseConnected ? 'क्लाउड डेटाबेस सक्रिय (Supabase Connected)' : 'ऑफलाइन लोकल स्टोरेज सक्रिय (Offline Mode)'}
              </div>
              <div className="text-[11px] font-normal text-slate-500">
                {isSupabaseConnected 
                  ? 'आपका सारा डेटा सीधे Supabase PostgreSQL में सुरक्षित हो रहा है'
                  : 'डेटा आपके ब्राउज़र में सुरक्षित है। Supabase जोड़ते ही ऑटो-सिंक हो जाएगा।'}
              </div>
            </div>
          </div>
        </div>

        {/* Supabase URL & Key Form */}
        <form onSubmit={handleTestAndSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              <span>कनेक्शन जांचें व सुरक्षित करें (Save &amp; Connect)</span>
            </button>

            {isSupabaseConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
              >
                डिस्कनेक्ट
              </button>
            )}
          </div>
        </form>

        {/* 1-Click SQL Copy Section */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileCode className="w-4 h-4 text-emerald-600" />
              <span>Supabase SQL सेटअप स्क्रिप्ट</span>
            </div>
            <button
              onClick={handleCopySqlSchema}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'कॉपी हो गया!' : '1-क्लिक SQL कॉपी करें'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            इसे Supabase Dashboard में <b className="text-slate-700">SQL Editor</b> में पेस्ट करके "Run" दबाएं।
          </p>
        </div>

        {/* Demo Data Reset */}
        <div className="border-t pt-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 block">डेरी सैंपल डेटा रिसेट</span>
            <span className="text-[11px] text-slate-500 block">
              ताज़ा दूध, पनीर, खर्च और बिक्री डेटा दोबारा लोड करें
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('क्या आप सैंपल डेरी डेटा दोबारा लोड करना चाहते हैं?')) {
                resetToSampleData();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डेटा रिसेट करें</span>
          </button>
        </div>

      </div>
    </div>
  );
};

