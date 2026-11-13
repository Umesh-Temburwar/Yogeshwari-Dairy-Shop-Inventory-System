import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  RotateCcw,
  ShieldCheck, 
  FileCode
} from 'lucide-react';
import { Modal, Input, Button } from '../ui';

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
      setTestingStatus({ testing: false, success: true, message: 'Supabase connected successfully!' });
      await syncWithSupabase();
    } else {
      setTestingStatus({ testing: false, success: false, message: result.message });
    }
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setKey('');
    setTestingStatus({ testing: false, success: false, message: 'Disconnected. Local Storage mode active.' });
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
`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase डेटाबेस सेटिंग्स"
      subtitle="Cloud PostgreSQL & Offline Storage Synchronization"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Status card */}
        <div className="p-3 rounded-xl bg-surface-2 border border-line/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {isSupabaseConnected ? (
              <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-ink-3 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-ink">
                {isSupabaseConnected ? 'क्लाउड डेटाबेस सक्रिय (Supabase Connected)' : 'ऑफलाइन लोकल स्टोरेज सक्रिय (Offline Mode)'}
              </div>
              <div className="text-[11px] text-ink-3">
                {isSupabaseConnected 
                  ? 'Data syncing directly with Supabase PostgreSQL'
                  : 'Data safely stored in local browser storage'}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">
              Supabase Project URL
            </label>
            <Input
              type="url"
              placeholder="https://xyz.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">
              Supabase Anon / Public API Key
            </label>
            <Input
              type="password"
              placeholder="eyJhbGciOi..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {testingStatus.message && (
            <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              testingStatus.success ? 'bg-ok/10 text-ok border border-ok/20' : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {testingStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testingStatus.message}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={testingStatus.testing}
              className="flex-1"
            >
              {testingStatus.testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>कनेक्शन जांचें व सुरक्षित करें</span>
            </Button>

            {isSupabaseConnected && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDisconnect}
              >
                डिस्कनेक्ट
              </Button>
            )}
          </div>
        </form>

        {/* 1-Click SQL Copy */}
        <div className="bg-surface-2 p-3 rounded-xl border border-line/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <FileCode className="w-4 h-4 text-ink-3" />
              <span>Supabase SQL सेटअप स्क्रिप्ट</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopySqlSchema}
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5 text-ink-2" />}
              <span>{copiedSql ? 'कॉपी झाले!' : 'SQL कॉपी'}</span>
            </Button>
          </div>
        </div>

        {/* Reset Demo Data */}
        <div className="border-t border-line/40 pt-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-ink block">डेअरी सॅम्पल डेटा रिसेट</span>
            <span className="text-[11px] text-ink-3 block">
              ताजे दूध, पनीर, खर्च आणि विक्री डेटा पुन्हा लोड करा
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm('सॅम्पल डेअरी डेटा पुन्हा लोड करायचा आहे का?')) {
                resetToSampleData();
                onClose();
              }
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डेटा रिसेट</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SupabaseConfigModal;
