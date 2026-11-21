import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  Printer, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Search,
  BellRing,
  AlertTriangle
} from 'lucide-react';
import { OnlineOrder, OnlineOrderStatus } from '../../types/onlineOrders';
import { fetchOnlineOrders, updateOnlineOrderStatus, cancelOnlineOrderByStaff } from '../../services/onlineOrdersService';
import { playNewOrderChime, testOrderChime, isSoundAlertsEnabled, setSoundAlertsEnabled } from '../../utils/audioChime';
import { supabase } from '../../supabaseClient';

export const OnlineOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OnlineOrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(isSoundAlertsEnabled());
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<OnlineOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [printSlipOrder, setPrintSlipOrder] = useState<OnlineOrder | null>(null);
  
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  // Load orders
  const loadOrders = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const data = await fetchOnlineOrders();
      
      // Check for genuinely new incoming orders to trigger chime
      if (isBackground && knownOrderIdsRef.current.size > 0) {
        const hasNewOrder = data.some(
          (o) => !knownOrderIdsRef.current.has(o.id) && (o.order_status === 'PLACED' || (o.order_status as any) === 'pending')
        );
        if (hasNewOrder) {
          playNewOrderChime();
        }
      }

      // Update known IDs
      data.forEach((o) => knownOrderIdsRef.current.add(o.id));
      setOrders(data);
    } catch (err) {
      console.error('Failed to load online orders:', err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // 1. Controlled Supabase Realtime Listener with proper cleanup
    let channel: any = null;
    try {
      channel = supabase
        .channel('admin-ecommerce-orders-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ecommerce_orders' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              playNewOrderChime();
            }
            loadOrders(true);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription unavailable:', err);
    }

    // 2. Safe controlled polling fallback every 45s (avoids high traffic)
    const pollTimer = setInterval(() => {
      loadOrders(true);
    }, 45000);

    return () => {
      clearInterval(pollTimer);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // Cleanup error ignored
        }
      }
    };
  }, []);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    setSoundAlertsEnabled(nextState);
    if (nextState) {
      testOrderChime();
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: OnlineOrderStatus) => {
    setActionInProgress(orderId);
    try {
      const updated = await updateOnlineOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } catch (err: any) {
      alert(`Status update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      alert('Please enter a cancellation reason');
      return;
    }
    setActionInProgress(cancelModalOrder.id);
    try {
      await cancelOnlineOrderByStaff(cancelModalOrder.id, cancelReason);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelModalOrder.id
            ? { ...o, order_status: 'CANCELLED', cancellation_reason: cancelReason }
            : o
        )
      );
      setCancelModalOrder(null);
      setCancelReason('');
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      order.order_status === statusFilter ||
      (statusFilter === 'PLACED' && (order.order_status as any) === 'pending');

    const matchesSearch =
      !searchQuery.trim() ||
      order.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery) ||
      (order.delivery_address?.address_line1 || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter(
    (o) => o.order_status === 'PLACED' || (o.order_status as any) === 'pending'
  ).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-28 lg:pb-12 px-2.5 sm:px-4">
      {/* 1. Header & Live Indicator */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#24352F] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                Online Orders Dispatch
              </h1>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
              Real-time customer orders from Yogeshwari Dairy E-Commerce
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 border-slate-300 dark:border-slate-700'
            }`}
            title="Toggle notification chime on incoming orders"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {soundEnabled && (
            <button
              type="button"
              onClick={() => testOrderChime()}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Test Chime
            </button>
          )}

          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-[#20332D] text-white hover:bg-slate-800 flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-bold scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PLACED', label: 'Pending Action' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'PREPARING', label: 'Preparing' },
            { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#131F1B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#24352F] hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* 3. Orders List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F]">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading online orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F]">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No orders found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {statusFilter === 'ALL'
              ? 'No customer orders have been received yet.'
              : `No orders matching status: ${statusFilter}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredOrders.map((order) => {
            const isPending = order.order_status === 'PLACED' || (order.order_status as any) === 'pending';
            const isConfirmed = order.order_status === 'CONFIRMED';
            const isPreparing = order.order_status === 'PREPARING';
            const isOutForDelivery = order.order_status === 'OUT_FOR_DELIVERY';
            const isDelivered = order.order_status === 'DELIVERED';
            const isCancelled = order.order_status === 'CANCELLED' || order.order_status === 'REJECTED';

            const isProcessingThis = actionInProgress === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-[#131F1B] rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  isPending
                    ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 dark:border-[#24352F]'
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {order.order_no}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : isConfirmed
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : isPreparing
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : isOutForDelivery
                            ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                            : isDelivered
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {order.order_status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(order.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 block">
                      ₹{order.total_amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-300 uppercase">
                      {order.payment_method} ({order.payment_status})
                    </span>
                  </div>
                </div>

                {/* Customer & Address Details */}
                <div className="p-3.5 sm:p-4 space-y-2.5 text-xs">
                  {/* Customer row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {order.customer_name}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        +91 {order.customer_phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/91${order.customer_phone}?text=${encodeURIComponent(
                          `Namaste ${order.customer_name}, regarding your Yogeshwari Dairy Order #${order.order_no}: `
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 hover:bg-green-100 transition"
                        title="WhatsApp Customer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25]/70 border border-slate-100 dark:border-slate-800 text-[11px] flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {order.delivery_address?.address_line1 || 'No address line'}
                      </p>
                      {order.delivery_address?.landmark && (
                        <p className="text-slate-400 text-[10px]">
                          Landmark: {order.delivery_address.landmark}
                        </p>
                      )}
                      <p className="text-slate-400 text-[10px]">
                        {order.delivery_address?.city || 'Bhandara'}, {order.delivery_address?.pincode || '441904'}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Items Ordered ({order.items?.length || 0})
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {order.items?.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 text-[11px]"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {it.product_name}
                            </span>
                            {it.pack_size && (
                              <span className="text-slate-400 ml-1 font-normal">
                                ({it.pack_size})
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 text-right font-mono font-bold">
                            <span className="text-slate-500 mr-2">x{it.quantity}</span>
                            <span className="text-slate-900 dark:text-white">
                              ₹{it.total_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Delivery Fee</span>
                        <span className="font-mono">₹{order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg mt-1">
                        Note: "{order.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#1A2A25] border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintSlipOrder(order)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F1B] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print Slip</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Status Step Buttons */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => setCancelModalOrder(order)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                        >
                          {isProcessingThis ? 'Updating...' : 'Accept Order'}
                        </button>
                      </>
                    )}

                    {isConfirmed && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingThis ? 'Updating...' : 'Start Packing'}
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusChange(order.id, 'OUT_FOR_DELIVERY')}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingThis ? 'Updating...' : 'Out for Delivery (Dispatch)'}
                      </button>
                    )}

                    {isOutForDelivery && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingThis ? 'Updating...' : 'Mark Delivered & Paid'}
                      </button>
                    )}

                    {isDelivered && (
                      <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Delivered
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Cancellation Prompt Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-[#24352F] shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Cancel / Reject Order #{cancelModalOrder.order_no}</span>
            </div>
            <p className="text-xs text-slate-500">
              Cancelling this order will release all allocated FEFO batches back into shop inventory.
            </p>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for cancellation:
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Item out of stock, Customer requested cancellation, Address unserviceable..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A2A25] font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOrder(null);
                  setCancelReason('');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Thermal Slip Modal (Print Preview) */}
      {printSlipOrder && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 text-slate-900 shadow-2xl space-y-3 text-xs font-mono">
            <div className="text-center border-b pb-2">
              <h3 className="font-black text-sm uppercase">YOGESHWARI DAIRY PRODUCTS</h3>
              <p className="text-[10px] text-slate-500">Bhandara (M.S.) | Online Delivery</p>
              <p className="text-[11px] font-bold mt-1">Order #{printSlipOrder.order_no}</p>
            </div>

            <div className="text-[11px] space-y-0.5 border-b pb-2">
              <p><span className="font-bold">Customer:</span> {printSlipOrder.customer_name}</p>
              <p><span className="font-bold">Phone:</span> {printSlipOrder.customer_phone}</p>
              <p><span className="font-bold">Address:</span> {printSlipOrder.delivery_address?.address_line1}, {printSlipOrder.delivery_address?.city}</p>
              <p><span className="font-bold">Payment:</span> {printSlipOrder.payment_method}</p>
            </div>

            <div className="space-y-1 border-b pb-2">
              {printSlipOrder.items?.map((it) => (
                <div key={it.id} className="flex justify-between text-[11px]">
                  <span>{it.quantity}x {it.product_name}</span>
                  <span>₹{it.total_price.toFixed(2)}</span>
                </div>
              ))}
              {printSlipOrder.delivery_fee > 0 && (
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Delivery Fee</span>
                  <span>₹{printSlipOrder.delivery_fee.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-black text-sm pt-1">
              <span>TOTAL</span>
              <span>₹{printSlipOrder.total_amount.toFixed(2)}</span>
            </div>

            <div className="flex gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintSlipOrder(null)}
                className="w-1/2 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
