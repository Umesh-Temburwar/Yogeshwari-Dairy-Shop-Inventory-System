import React, { useState } from 'react';
import { Bike, X, User, Phone, Truck, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export interface AssignRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  customerName: string;
  currentRiderName?: string;
  currentRiderPhone?: string;
  currentRiderVehicle?: string;
  onRiderAssigned: (rider: {
    rider_name: string;
    rider_phone: string;
    rider_vehicle?: string;
    notes?: string;
  }) => void;
}

// Preset verified store delivery fleet profiles
const PRESET_RIDERS = [
  {
    name: 'Sunil Rao',
    phone: '9876543210',
    vehicle: 'MH-31-DY-1008 (Express Scooter)',
    role: 'Express Dairy Fleet Rider 1',
  },
  {
    name: 'निलेश सखारे (काऊंटर १)',
    phone: '9896000000',
    vehicle: 'MH-31-DY-2024 (Store Fleet)',
    role: 'Shop Counter Dispatcher',
  },
];

export const AssignRiderModal: React.FC<AssignRiderModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  customerName,
  currentRiderName,
  currentRiderPhone,
  currentRiderVehicle,
  onRiderAssigned,
}) => {
  const [riderName, setRiderName] = useState(currentRiderName || 'Sunil Rao');
  const [riderPhone, setRiderPhone] = useState(currentRiderPhone || '9876543210');
  const [riderVehicle, setRiderVehicle] = useState(currentRiderVehicle || 'MH-31-DY-1008');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_RIDERS[0]) => {
    setRiderName(preset.name);
    setRiderPhone(preset.phone);
    setRiderVehicle(preset.vehicle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName.trim()) {
      setError('Rider name is required');
      return;
    }
    if (!riderPhone.trim() || riderPhone.trim().length < 10) {
      setError('Valid 10-digit phone number is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updates: Record<string, unknown> = {
        delivery_partner_name: riderName.trim(),
        delivery_partner_phone: riderPhone.trim(),
        delivery_partner_vehicle: riderVehicle.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (notes.trim()) {
        updates.delivery_notes = notes.trim();
      }

      const { error: dbError } = await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', orderId);

      if (dbError) {
        console.warn('Database update error:', dbError.message);
      }

      onRiderAssigned({
        rider_name: riderName.trim(),
        rider_phone: riderPhone.trim(),
        rider_vehicle: riderVehicle.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">Assign Delivery Boy / Rider</h3>
              <p className="text-xs text-slate-400">
                Order #{orderNumber} • {customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          {/* Quick Select Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Quick Select Fleet Staff
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_RIDERS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    riderName === preset.name
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs">
                    <span className="font-extrabold block">{preset.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {preset.role} • {preset.phone}
                    </span>
                  </div>
                  {riderName === preset.name && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rider Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Rider Full Name</span>
            </label>
            <input
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Sunil Rao"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          {/* Rider Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Rider Contact Phone</span>
            </label>
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>Vehicle Number / Details</span>
            </label>
            <input
              type="text"
              value={riderVehicle}
              onChange={(e) => setRiderVehicle(e.target.value)}
              placeholder="e.g. MH-31-DY-1008 (Scooter)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Special Delivery Instructions / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff Dispatch Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver chilled milk pack first; collect cash on arrival"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Bike className="w-4 h-4" />
              <span>{isSubmitting ? 'Assigning...' : 'Confirm Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
