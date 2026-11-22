import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  Package,
  X,
  Sparkles,
  Barcode,
  Truck,
  RotateCcw,
  Volume2,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { OnlineOrder, OnlineOrderItem } from '../../types/onlineOrders';
import {
  playScanSuccessChime,
  playScanErrorChime,
  playScanCompleteChime,
} from '../../utils/audioChime';
import { updateOrderPackingProgress, updateOnlineOrderStatus } from '../../services/onlineOrdersService';
import { useStore } from '../../context/StoreContext';

export interface YogiMartOrderPackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OnlineOrder;
  onOrderUpdated?: (updated: OnlineOrder) => void;
}

export const YogiMartOrderPackingModal: React.FC<YogiMartOrderPackingModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}) => {
  const { products } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Map of item_id -> quantity scanned
  const [scannedMap, setScannedMap] = useState<Record<string, number>>(() => {
    if (order.packing_scanned_map) return { ...order.packing_scanned_map };
    // Default initial map
    const initial: Record<string, number> = {};
    (order.items || []).forEach((it) => {
      initial[it.id] = it.scanned_quantity || 0;
    });
    return initial;
  });

  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScanAlert, setLastScanAlert] = useState<{
    type: 'success' | 'error' | 'duplicate';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Compute total target units and scanned units
  const totalUnits = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
  const scannedUnits = Object.values(scannedMap).reduce((acc, val) => acc + val, 0);
  const isAllVerified = totalUnits > 0 && scannedUnits >= totalUnits;
  const progressPercent = totalUnits > 0 ? Math.min(100, Math.round((scannedUnits / totalUnits) * 100)) : 0;

  // Auto focus barcode input field
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Hardware Barcode Scanner listener (USB / Bluetooth Laser Gun)
  // Barcode guns rapidly emit key strokes (< 40ms) terminated by 'Enter'
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside another input/textarea
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT' &&
        document.activeElement !== inputRef.current
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          processBarcode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // Fast sequence typically from barcode scanners
        if (timeDiff > 120 && buffer.length > 0) {
          buffer = ''; // Reset stale input
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scannedMap, order.items, products]);

  // Find product barcode either directly from item or from inventory store products
  const getItemBarcode = (item: OnlineOrderItem): string | null => {
    if (item.barcode) return item.barcode;
    const prod = products.find((p) => p.id === item.product_id || p.name.toLowerCase() === item.product_name.toLowerCase());
    return prod?.barcode || null;
  };

  // Core Barcode Processing Function
  const processBarcode = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return;

    const items = order.items || [];

    // Find matching item
    const matchedItem = items.find((it) => {
      const itemBarcode = getItemBarcode(it)?.toLowerCase();
      const prodMatch = products.find(
        (p) => p.id === it.product_id && p.barcode?.toLowerCase() === cleanCode
      );
      return (
        itemBarcode === cleanCode ||
        Boolean(prodMatch) ||
        it.product_name.toLowerCase().includes(cleanCode) ||
        it.id.toLowerCase() === cleanCode
      );
    });

    if (matchedItem) {
      const currentCount = scannedMap[matchedItem.id] || 0;
      const targetCount = matchedItem.quantity || 1;

      if (currentCount < targetCount) {
        const nextMap = { ...scannedMap, [matchedItem.id]: currentCount + 1 };
        setScannedMap(nextMap);

        // Visual flash highlight
        setHighlightedItemId(matchedItem.id);
        setTimeout(() => setHighlightedItemId(null), 1200);

        const newScannedUnits = Object.values(nextMap).reduce((a, b) => a + b, 0);
        if (newScannedUnits >= totalUnits) {
          playScanCompleteChime();
          setLastScanAlert({
            type: 'success',
            message: `🎉 Perfect! ${matchedItem.product_name} verified. ALL ITEMS 100% PACKED!`,
          });
        } else {
          playScanSuccessChime();
          setLastScanAlert({
            type: 'success',
            message: `✅ Verified: ${matchedItem.product_name} (${currentCount + 1}/${targetCount})`,
          });
        }
      } else {
        playScanSuccessChime();
        setLastScanAlert({
          type: 'duplicate',
          message: `ℹ️ All ${targetCount} units of ${matchedItem.product_name} are already verified!`,
        });
      }
    } else {
      playScanErrorChime();
      setLastScanAlert({
        type: 'error',
        message: `⚠️ Barcode [${scannedCode}] does not match any item in Order #${order.order_no}!`,
      });
    }

    setBarcodeInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processBarcode(barcodeInput.trim());
    }
  };

  // Manual one-click verification for loose/un-barcoded items (e.g. Fresh Paneer)
  const handleQuickVerifyItem = (itemId: string) => {
    const it = (order.items || []).find((i) => i.id === itemId);
    if (!it) return;

    const current = scannedMap[itemId] || 0;
    const target = it.quantity || 1;

    if (current < target) {
      const nextMap = { ...scannedMap, [itemId]: current + 1 };
      setScannedMap(nextMap);
      setHighlightedItemId(itemId);
      setTimeout(() => setHighlightedItemId(null), 1000);

      const newScannedUnits = Object.values(nextMap).reduce((a, b) => a + b, 0);
      if (newScannedUnits >= totalUnits) {
        playScanCompleteChime();
        setLastScanAlert({
          type: 'success',
          message: `🎉 All items packed! Bag sealed.`,
        });
      } else {
        playScanSuccessChime();
        setLastScanAlert({
          type: 'success',
          message: `✅ Manually verified: ${it.product_name} (${current + 1}/${target})`,
        });
      }
    }
  };

  // Reset verification for an item
  const handleResetItem = (itemId: string) => {
    setScannedMap((prev) => ({ ...prev, [itemId]: 0 }));
  };

  // Save progress & push update to order notes / Supabase
  const handleSaveProgress = async (advanceToReady = false) => {
    setIsSaving(true);
    try {
      const updated = await updateOrderPackingProgress(
        order.id,
        scannedMap,
        isAllVerified || advanceToReady
      );

      if (advanceToReady && isAllVerified) {
        // Advance status to OUT_FOR_DELIVERY or PREPARING
        await updateOnlineOrderStatus(
          order.id,
          'PREPARING',
          `[PACKED] All ${totalUnits} items barcode-verified by staff`
        );
      }

      onOrderUpdated?.(updated);
      onClose();
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 sm:p-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Barcode className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    YogiMart-Style Packing Station
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                    LIVE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Order #{order.order_no} • {order.customer_name}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar Strip */}
          <div className="mt-4 bg-black/20 p-3 rounded-2xl border border-white/15">
            <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
              <span className="flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-emerald-300" />
                <span>Packing Progress</span>
              </span>
              <span className="font-mono text-emerald-200">
                {scannedUnits} of {totalUnits} Units ({progressPercent}%)
              </span>
            </div>

            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${isAllVerified ? 'bg-emerald-300' : 'bg-emerald-400'
                  }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Barcode Scanner Input Row */}
          <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F]">
            <form onSubmit={handleManualScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode with laser gun or type here..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition flex items-center gap-1.5 shrink-0"
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 pl-1">
              ⚡ USB/Bluetooth Barcode Guns auto-detect on scan. Customer sees live verification on their app.
            </p>
          </div>

          {/* Feedback Banner */}
          {lastScanAlert && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 border animate-in fade-in duration-150 ${lastScanAlert.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : lastScanAlert.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                }`}
            >
              <div className="flex items-center gap-2">
                {lastScanAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{lastScanAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setLastScanAlert(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Items Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              <span>Order Items to Pack ({order.items?.length || 0})</span>
              <span>Scanned / Target</span>
            </div>

            <div className="space-y-2">
              {(order.items || []).map((item) => {
                const count = scannedMap[item.id] || 0;
                const target = item.quantity || 1;
                const isComplete = count >= target;
                const barcode = getItemBarcode(item);
                const isHighlighted = highlightedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${isHighlighted
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/60'
                        : isComplete
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-[#131F1B] border-slate-200 dark:border-[#24352F]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${isComplete
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                      >
                        {isComplete ? <Check className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {item.product_name}
                          </span>
                          {item.pack_size && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              ({item.pack_size})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                          {barcode ? (
                            <span className="inline-flex items-center gap-0.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              <Barcode className="w-3 h-3" />
                              <span>{barcode}</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              (No barcode • Tap verify)
                            </span>
                          )}
                          <span>₹{item.unit_price} each</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Manual Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-1 rounded-lg ${isComplete
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                      >
                        {count} / {target}
                      </span>

                      {!isComplete ? (
                        <button
                          type="button"
                          onClick={() => handleQuickVerifyItem(item.id)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-xs flex items-center gap-1"
                        >
                          <span>+1 Verify</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResetItem(item.id)}
                          title="Reset count"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25]/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {isAllVerified
                ? 'All items verified. Ready to seal bag!'
                : `${totalUnits - scannedUnits} units left to scan.`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveProgress(false)}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer transition"
            >
              Save Progress
            </button>

            <button
              type="button"
              disabled={isSaving || !isAllVerified}
              onClick={() => handleSaveProgress(true)}
              className={`w-1/2 sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${isAllVerified
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                }`}
            >
              <Truck className="w-4 h-4" />
              <span>Mark Packed & Ready ⚡</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BlinkitOrderPackingModal = YogiMartOrderPackingModal;

