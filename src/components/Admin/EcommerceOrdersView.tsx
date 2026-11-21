import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  EcommerceOrder,
  EcommerceOrderStatus,
  EcommerceOrderItem
} from '../../types';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Printer,
  Phone,
  MessageCircle,
  MapPin,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Calendar,
  X,
  IndianRupee,
  Layers
} from 'lucide-react';

type FilterTab = 'ALL' | EcommerceOrderStatus;

export const EcommerceOrdersView: React.FC = () => {
  const { batches } = useStore();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ydo_order_audio_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // Action modals
  const [receiptOrder, setReceiptOrder] = useState<EcommerceOrder | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('80mm');
  const [cancelModalOrder, setCancelModalOrder] = useState<EcommerceOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Out of stock');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Web Audio API Ding-Dong Chime for incoming orders
  const playNewOrderChime = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First note: High chime (880 Hz / A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second note: Lower resonant chime (1174.66 Hz / D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.65);
    } catch {
      // Audio autoplay restrictions or unsupported browser
    }
  }, [isAudioEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch orders with item lines from Supabase
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const { data: ordersData, error: ordersErr } = await supabase
        .from('ecommerce_orders')
        .select(`
          *,
          items:ecommerce_order_items(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersErr) {
        console.warn('Error fetching ecommerce_orders:', ordersErr.message);
      } else if (ordersData) {
        setOrders(ordersData as EcommerceOrder[]);
      }
    } catch (e) {
      console.warn('Failed to load ecommerce orders:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime channel subscription
  useEffect(() => {
    const channel = supabase
      .channel('inventory-ecommerce-orders-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ecommerce_orders' },
        (payload) => {
          const newOrder = payload.new as EcommerceOrder;
          playNewOrderChime();
          showToast(`🔔 New Order #${newOrder.order_no} received from ${newOrder.customer_name} (₹${newOrder.total_amount})`);
          fetchOrders(true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ecommerce_orders' },
        () => {
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, playNewOrderChime]);

  // Toggle sound
  const handleToggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ydo_order_audio_enabled', String(next));
      } catch {}
      if (next) {
        playNewOrderChime();
      }
      return next;
    });
  };

  // Update order status in Supabase
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: EcommerceOrderStatus,
    paymentStatus?: 'PAID' | 'PENDING'
  ) => {
    setIsUpdatingStatus(orderId);
    try {
      const updates: Record<string, unknown> = {
        order_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'CONFIRMED') {
        updates.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'DELIVERED') {
        updates.delivered_at = new Date().toISOString();
        if (paymentStatus) {
          updates.payment_status = paymentStatus;
        } else {
          updates.payment_status = 'PAID';
        }
      }

      const { error } = await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) {
        showToast(`❌ Failed to update order: ${error.message}`);
      } else {
        showToast(`✅ Order status updated to ${newStatus}`);
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, ...updates } : ord))
        );
      }
    } catch (e: unknown) {
      showToast(`❌ Update error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Reject / Cancel Order
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    const finalReason = cancelReason === 'Other' ? customCancelReason : cancelReason;
    setIsUpdatingStatus(cancelModalOrder.id);
    try {
      const updates = {
        order_status: 'CANCELLED' as EcommerceOrderStatus,
        cancellation_reason: finalReason || 'Cancelled by store staff',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'Store Staff / Admin',
        updated_at: new Date().toISOString()
      };

      // Call atomic cancellation function to restore FEFO batch stock idempotently
      let cancelledSuccessfully = false;
      try {
        const { error: rpcErr } = await supabase.rpc('fn_cancel_ecommerce_order_atomic', {
          p_order_id: cancelModalOrder.id,
          p_cancellation_reason: finalReason || 'Cancelled by store staff',
          p_cancelled_by: 'Store Staff / Admin'
        });
        if (!rpcErr) {
          cancelledSuccessfully = true;
          showToast(`Order #${cancelModalOrder.order_no} cancelled & batch stock restored.`);
        }
      } catch {
        // Fallback to table update below
      }

      if (!cancelledSuccessfully) {
        const { error } = await supabase
          .from('ecommerce_orders')
          .update(updates)
          .eq('id', cancelModalOrder.id);

      if (error) {
        showToast(`❌ Failed to cancel order: ${error.message}`);
      } else {
        showToast(`Order #${cancelModalOrder.order_no} cancelled.`);
        setOrders((prev) =>
          prev.map((ord) =>
            ord.id === cancelModalOrder.id ? { ...ord, ...updates } : ord
          )
        );
      }
    } finally {
      setIsUpdatingStatus(null);
      setCancelModalOrder(null);
      setCustomCancelReason('');
    }
  };

  // Status counts
  const counts = useMemo(() => {
    const res = {
      ALL: orders.length,
      PLACED: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REJECTED: 0
    };
    orders.forEach((o) => {
      if (res[o.order_status] !== undefined) {
        res[o.order_status]++;
      }
    });
    return res;
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab !== 'ALL' && o.order_status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = o.order_no.toLowerCase().includes(q);
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.customer_phone.toLowerCase().includes(q);
        const matchItem = o.items?.some((it) =>
          it.product_name.toLowerCase().includes(q)
        );
        return matchNo || matchName || matchPhone || matchItem;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // FEFO Batch Recommender for staff order fulfillment
  const getFefoBatchRecommendation = (productId?: string | null) => {
    if (!productId) return null;
    const matchingBatches = batches
      .filter((b) => b.product_id === productId && b.qty_remaining > 0)
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    return matchingBatches[0] || null;
  };

  // Status Badge Helper
  const renderStatusBadge = (status: EcommerceOrderStatus) => {
    switch (status) {
      case 'PLACED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Placed (Pending)
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            <Package className="w-3.5 h-3.5" />
            Packing
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700">
            <Truck className="w-3.5 h-3.5" />
            Out for Delivery
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Delivered
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <XCircle className="w-3.5 h-3.5" />
            {status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#24352F] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Online Customer Orders
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Realtime Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Direct live orders from customer e-commerce web app. Accept, pack with FEFO shelf batches, dispatch, and track delivery.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isAudioEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
              }`}
              title={isAudioEnabled ? 'Incoming Order Chime: ON' : 'Incoming Order Chime: MUTED'}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAudioEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchOrders(false)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-4 mt-3 border-t border-slate-100 dark:border-[#1E3029]">
          {(
            [
              { id: 'ALL', label: 'All Orders', count: counts.ALL },
              { id: 'PLACED', label: 'Placed (Pending)', count: counts.PLACED, highlight: true },
              { id: 'CONFIRMED', label: 'Confirmed', count: counts.CONFIRMED },
              { id: 'PREPARING', label: 'Packing', count: counts.PREPARING },
              { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: counts.OUT_FOR_DELIVERY },
              { id: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED },
              { id: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED }
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#24352F]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-emerald-900 text-white'
                      : tab.highlight && tab.count > 0
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-[#24352F] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order # (e.g. ORD-1001), customer name, phone, or item..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders List / Empty State */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#24352F]">
          <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Syncing live orders with Supabase...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#24352F]">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No orders found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}". Try clearing search.`
              : activeTab === 'ALL'
              ? 'Customer orders placed on the e-commerce website will appear here in real-time.'
              : `No orders in "${activeTab}" status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const isPlaced = order.order_status === 'PLACED';
            const isConfirmed = order.order_status === 'CONFIRMED';
            const isPreparing = order.order_status === 'PREPARING';
            const isOutForDelivery = order.order_status === 'OUT_FOR_DELIVERY';
            const isDelivered = order.order_status === 'DELIVERED';
            const isCancelled = order.order_status === 'CANCELLED' || order.order_status === 'REJECTED';
            const isCod = order.payment_method === 'COD';
            const isPaid = order.payment_status === 'PAID';

            // WhatsApp link with friendly Marathi/English order greeting
            const waText = encodeURIComponent(
              `Namaste ${order.customer_name}! 🥛\nRegarding your Yogeshwari Dairy Order #${order.order_no} (₹${order.total_amount}):\nStatus: ${order.order_status}\nExpected Delivery: 15-30 mins.\nThank you for shopping with us!`
            );
            const waUrl = `https://wa.me/91${order.customer_phone.replace(/\D/g, '')}?text=${waText}`;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-[#131F1B] rounded-2xl p-4 sm:p-5 border transition-all ${
                  isPlaced
                    ? 'border-amber-400 dark:border-amber-600 shadow-md ring-1 ring-amber-400/30'
                    : 'border-slate-200 dark:border-[#24352F] shadow-xs'
                }`}
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E3029]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                      #{order.order_no}
                    </span>
                    {renderStatusBadge(order.order_status)}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(order.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 flex items-center">
                      ₹{order.total_amount}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isCod
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {order.payment_method} &bull; {order.payment_status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-700 dark:text-slate-300 transition-colors"
                      title="Print 58mm/80mm Delivery Receipt"
                    >
                      <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                </div>

                {/* Customer & Address Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 border-b border-slate-100 dark:border-[#1E3029] text-xs">
                  {/* Customer Info */}
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{order.customer_name}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{order.customer_phone}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-slate-300 font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Call</span>
                      </a>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">
                          {order.delivery_address?.recipientName || order.customer_name}
                        </span>{' '}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-200 dark:bg-slate-700 uppercase">
                          {order.delivery_address?.addressType || 'HOME'}
                        </span>
                        <div className="text-slate-500 dark:text-slate-400">
                          {order.delivery_address?.addressLine1}
                          {order.delivery_address?.addressLine2 ? `, ${order.delivery_address.addressLine2}` : ''}
                          {order.delivery_address?.landmark ? ` (Near: ${order.delivery_address.landmark})` : ''}
                          {order.delivery_address?.city ? `, ${order.delivery_address.city}` : ''}
                          {order.delivery_address?.pincode ? ` - ${order.delivery_address.pincode}` : ''}
                        </div>
                      </div>
                    </div>

                    {order.delivery_notes && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <b>Customer Note:</b> {order.delivery_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items & FEFO Picking Recommendations */}
                <div className="py-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Order Items ({order.items?.length || 0})</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-normal normal-case flex items-center gap-1">
                      <Layers className="w-3 h-3" /> FEFO Shelf Recommendations Active
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {order.items?.map((item: EcommerceOrderItem) => {
                      const fefoBatch = getFefoBatchRecommendation(item.product_id);
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-white">
                              {item.product_name}
                            </span>
                            {item.pack_size && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                ({item.pack_size})
                              </span>
                            )}
                            <span className="font-black text-emerald-700 dark:text-emerald-400">
                              &times; {item.quantity} {item.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {/* FEFO Hint */}
                            {fefoBatch && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-mono font-semibold"
                                title={`Batch: ${fefoBatch.batch_no} | Exp: ${fefoBatch.expiry_date} | Stock: ${fefoBatch.qty_remaining}`}
                              >
                                Pick: {fefoBatch.batch_no} (Exp: {fefoBatch.expiry_date})
                              </span>
                            )}

                            <span className="font-bold text-slate-900 dark:text-white">
                              ₹{item.total_price}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3029] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isCod && !isPaid && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        Cash to Collect upon delivery: <b>₹{order.total_amount}</b>
                      </span>
                    )}
                    {isPaid && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Payment settled via {order.payment_method}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action 1: PLACED -> Accept or Reject */}
                    {isPlaced && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>
                      </>
                    )}

                    {/* Action 2: CONFIRMED -> Start Preparing */}
                    {isConfirmed && (
                      <button
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Start Packing</span>
                      </button>
                    )}

                    {/* Action 3: PREPARING -> Out for Delivery */}
                    {isPreparing && (
                      <button
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                        className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Out for Delivery</span>
                      </button>
                    )}

                    {/* Action 4: OUT_FOR_DELIVERY -> Delivered */}
                    {isOutForDelivery && (
                      <button
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED', 'PAID')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Delivered & Paid</span>
                      </button>
                    )}

                    {/* Receipt Print button */}
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1 border border-slate-300 dark:border-slate-700 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Delivery Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* THERMAL DELIVERY RECEIPT MODAL (58mm / 80mm) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Thermal Delivery Slip
                </h3>
                <p className="text-xs text-slate-500">Order #{receiptOrder.order_no}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptWidth(receiptWidth === '80mm' ? '58mm' : '80mm')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Width: {receiptWidth}
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div
              id="printable-delivery-slip"
              className={`bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#24352F] font-mono text-xs space-y-2 mx-auto ${
                receiptWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[340px]'
              }`}
            >
              {/* Header */}
              <div className="text-center border-b border-slate-200 dark:border-[#24352F] pb-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  YOGESHWARI DAIRY PRODUCTS
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fresh Milk, Paneer, Curd, Pure Ghee
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Shop No. 1, Main Road, Bhandara - 441904
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  FSSAI Lic: 21524012000341 &bull; Mo: 9823XXXXXX
                </div>
                <div className="text-[11px] font-black pt-1 uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  ** ONLINE DELIVERY SLIP **
                </div>
              </div>

              {/* Order Metadata */}
              <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>Order: #{receiptOrder.order_no}</span>
                  <span>
                    {new Date(receiptOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Date: {new Date(receiptOrder.created_at).toLocaleDateString()}</span>
                  <span>Type: Express Dairy</span>
                </div>
              </div>

              {/* Customer & Address */}
              <div className="border-t border-b border-slate-200 dark:border-[#24352F] py-1.5 text-[11px] space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">
                  Customer: {receiptOrder.customer_name}
                </div>
                <div>Phone: {receiptOrder.customer_phone}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300">
                  Address: {receiptOrder.delivery_address?.addressLine1}
                  {receiptOrder.delivery_address?.addressLine2 ? `, ${receiptOrder.delivery_address.addressLine2}` : ''}
                  {receiptOrder.delivery_address?.landmark ? ` (Near: ${receiptOrder.delivery_address.landmark})` : ''}
                  {receiptOrder.delivery_address?.city ? `, ${receiptOrder.delivery_address.city}` : ''}
                </div>
                {receiptOrder.delivery_notes && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                    Note: {receiptOrder.delivery_notes}
                  </div>
                )}
              </div>

              {/* Itemized Lines */}
              <div className="space-y-1 py-1">
                <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 dark:border-[#24352F] pb-1">
                  <span>ITEM</span>
                  <span>QTY &times; RATE = TOTAL</span>
                </div>
                {receiptOrder.items?.map((it, idx) => (
                  <div key={idx} className="space-y-0.5 text-[11px] text-slate-800 dark:text-slate-200">
                    <div className="flex justify-between gap-1">
                      <span className="truncate max-w-[150px] font-semibold">{it.product_name}</span>
                      <span>
                        {it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="border-t border-slate-200 dark:border-[#24352F] pt-1.5 space-y-0.5 text-right font-bold text-xs">
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                  <span>Subtotal:</span>
                  <span>₹{receiptOrder.subtotal || receiptOrder.total_amount}</span>
                </div>
                {receiptOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                    <span>Delivery Charge:</span>
                    <span>₹{receiptOrder.delivery_fee}</span>
                  </div>
                )}
                {receiptOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-600 font-normal">
                    <span>Discount:</span>
                    <span>-₹{receiptOrder.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400 font-black border-t border-dashed border-slate-300 dark:border-[#24352F] pt-1">
                  <span>NET PAYABLE:</span>
                  <span>₹{receiptOrder.total_amount}</span>
                </div>
                <div className="text-[10px] font-normal text-slate-500 pt-0.5">
                  Payment: {receiptOrder.payment_method} &bull; {receiptOrder.payment_status}
                  {receiptOrder.payment_method === 'COD' && receiptOrder.payment_status !== 'PAID' && (
                    <div className="font-bold text-rose-600 dark:text-rose-400 text-[11px] mt-0.5">
                      *** COLLECT CASH: ₹{receiptOrder.total_amount} ***
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#24352F] text-[9px] text-slate-500 flex justify-between">
                <div>Delivery Partner Sign</div>
                <div>Customer Sign</div>
              </div>

              <div className="text-center text-[9px] text-slate-400 pt-1">
                Thank you! Fresh dairy delivered directly from shop.
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Delivery Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT / CANCEL ORDER MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Reject Order #{cancelModalOrder.order_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select reason for cancellation. Customer will see this status in their order tracking page.
            </p>

            <div className="space-y-2">
              {['Out of stock', 'Outside delivery area', 'Shop closed for the day', 'Customer requested cancellation', 'Other'].map(
                (reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-[#24352F] hover:bg-slate-50 dark:hover:bg-[#1A2A25] cursor-pointer text-xs"
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{reason}</span>
                  </label>
                )
              )}

              {cancelReason === 'Other' && (
                <input
                  type="text"
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Specify cancellation reason..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Cancellation</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
