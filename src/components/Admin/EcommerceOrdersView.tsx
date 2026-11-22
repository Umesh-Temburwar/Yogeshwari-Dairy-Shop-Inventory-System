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
  Layers,
  Compass,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  MoreVertical,
  Bell,
  Tag
} from 'lucide-react';
import { FilterChip, ChipRow, SearchBar, StatusBadge } from '../Common/UI';

const BACKEND_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1').replace(/\/$/, '');
import { DeliveryNavigationModal } from './DeliveryNavigationModal';
import { AssignRiderModal } from './AssignRiderModal';
import { BlinkitOrderPackingModal } from '../OnlineOrders/BlinkitOrderPackingModal';
import { PromotionalBannersModal } from './PromotionalBannersModal';
import { BrandLogoManagerModal } from './BrandLogoManagerModal';
import { convertOnlineOrderToCompletedSale } from '../../services/onlineOrdersService';
import {
  playBlinkitAlertTone,
  startBlinkitOrderAlarm,
  stopBlinkitOrderAlarm,
  subscribeToBlinkitAlarmState,
  isBlinkitAlarmRinging,
} from '../../utils/audioChime';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showOrderNotification,
  NotificationStatus,
} from '../../services/notificationService';

type FilterTab = 'ALL' | EcommerceOrderStatus;

export const EcommerceOrdersView: React.FC = () => {
  const { batches } = useStore();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [packingOrder, setPackingOrder] = useState<EcommerceOrder | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationStatus>(() => getNotificationPermission());
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ydo_order_audio_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ydo_online_store_open') !== 'false';
    } catch {
      return true;
    }
  });
  const [isUpdatingStoreStatus, setIsUpdatingStoreStatus] = useState<boolean>(false);

  // Action modals
  const [receiptOrder, setReceiptOrder] = useState<EcommerceOrder | null>(null);
  const [navigationOrder, setNavigationOrder] = useState<EcommerceOrder | null>(null);
  const [assignRiderOrder, setAssignRiderOrder] = useState<EcommerceOrder | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>(() => {
    try {
      return (localStorage.getItem('ydo_receipt_width') as '58mm' | '80mm') || '80mm';
    } catch {
      return '80mm';
    }
  });
  const [cancelModalOrder, setCancelModalOrder] = useState<EcommerceOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Out of stock');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(() => isBlinkitAlarmRinging());
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>(() => {
    try {
      return (localStorage.getItem('ydo_ecommerce_view_mode') as 'cards' | 'compact') || 'cards';
    } catch {
      return 'cards';
    }
  });

  // Delivery ETA promise state (Synchronized in realtime with customer e-commerce app)
  const [deliveryEta, setDeliveryEta] = useState<string>(() => {
    try {
      return localStorage.getItem('ydo_online_delivery_time') || '15-25 mins';
    } catch {
      return '15-25 mins';
    }
  });
  const [isUpdatingDeliveryEta, setIsUpdatingDeliveryEta] = useState<boolean>(false);
  const [isEtaModalOpen, setIsEtaModalOpen] = useState<boolean>(false);
  const [isBannersModalOpen, setIsBannersModalOpen] = useState<boolean>(false);
  const [isBrandLogosModalOpen, setIsBrandLogosModalOpen] = useState<boolean>(false);
  const [customEtaInput, setCustomEtaInput] = useState<string>('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [expandedItemsMap, setExpandedItemsMap] = useState<Record<string, boolean>>({});
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState<boolean>(false);
  const [isAlarmBannerDismissed, setIsAlarmBannerDismissed] = useState<boolean>(false);

  const toggleOrderExpanded = (orderId: string, currentExpanded: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [orderId]: !currentExpanded }));
  };

  const toggleItemsExpanded = (orderId: string) => {
    setExpandedItemsMap((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleToggleViewMode = (mode: 'cards' | 'compact') => {
    setViewMode(mode);
    try {
      localStorage.setItem('ydo_ecommerce_view_mode', mode);
    } catch {}
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Listen to global continuous Blinkit order alarm state
  useEffect(() => {
    return subscribeToBlinkitAlarmState((ringing) => {
      setIsAlarmRinging(ringing);
    });
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Play Blinkit Merchant Order alert chime + vibration
  const playNewOrderChime = useCallback(() => {
    if (!isAudioEnabled) return;
    setIsAudioUnlocked(true);
    playBlinkitAlertTone();
  }, [isAudioEnabled]);

  // Explicit user unlock function to satisfy browser autoplay restrictions
  const unlockAudio = useCallback(() => {
    try {
      setIsAudioUnlocked(true);
      playBlinkitAlertTone();
      showToast('🔔 Blinkit Order Alert Sound is now LIVE & ACTIVE!');
    } catch { }
  }, []);

  // Update receipt width and persist preference
  const handleChangeReceiptWidth = (w: '58mm' | '80mm') => {
    setReceiptWidth(w);
    try {
      localStorage.setItem('ydo_receipt_width', w);
    } catch { }
  };

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
        const orderList = ordersData as EcommerceOrder[];
        setOrders(orderList);
        const hasUnaccepted = orderList.some((o) => o.order_status === 'PLACED');
        if (hasUnaccepted) {
          startBlinkitOrderAlarm(`Order #${orderList.find(o => o.order_status === 'PLACED')?.order_no}`);
        } else {
          stopBlinkitOrderAlarm();
        }
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
          startBlinkitOrderAlarm(`Order #${newOrder.order_no}`);
          showOrderNotification({
            orderNo: newOrder.order_no,
            customerName: newOrder.customer_name,
            amount: newOrder.total_amount,
            orderId: newOrder.id,
          }).catch(console.error);
          setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
          // Clear new badge after 90 seconds
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(newOrder.id);
              return next;
            });
          }, 90000);
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

  // Resilient background auto-polling every 8 seconds (ensures orders update smoothly even if Realtime drops)
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchOrders(true);
    }, 8000);
    return () => clearInterval(pollTimer);
  }, [fetchOrders]);

  // Synchronize Online Store Open / Closed status & Delivery ETA with Supabase profiles
  useEffect(() => {
    const fetchStoreStatus = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('default_redirect_view, ecommerce_delivery_time')
          .eq('role', 'Owner')
          .single();
        if (data && data.default_redirect_view) {
          const val = data.default_redirect_view;
          const isClosed = val.includes('store_closed');
          setIsStoreOpen(!isClosed);
          try {
            localStorage.setItem('ydo_online_store_open', String(!isClosed));
          } catch { }

          let eta = (data as any).ecommerce_delivery_time;
          if (!eta && val.includes('eta_')) {
            const match = val.match(/eta_([a-zA-Z0-9_\-]+)/);
            if (match && match[1]) {
              eta = match[1].replace(/_/g, ' ');
            }
          }
          if (eta) {
            setDeliveryEta(eta);
            try {
              localStorage.setItem('ydo_online_delivery_time', eta);
            } catch { }
          }
        }
      } catch { }
    };
    fetchStoreStatus();

    // Listen to real-time changes on profiles for multi-counter & customer web sync
    const profileSub = supabase
      .channel('store-status-sync-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload.new && payload.new.role === 'Owner') {
            const val = payload.new.default_redirect_view || '';
            const isClosed = val.includes('store_closed');
            setIsStoreOpen(!isClosed);

            let eta = payload.new.ecommerce_delivery_time;
            if (!eta && val.includes('eta_')) {
              const match = val.match(/eta_([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) {
                eta = match[1].replace(/_/g, ' ');
              }
            }
            if (eta) {
              setDeliveryEta(eta);
              try {
                localStorage.setItem('ydo_online_delivery_time', eta);
              } catch { }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSub);
    };
  }, []);

  // Save Delivery Time ETA promise & broadcast to E-Commerce customer app in real-time
  const handleSaveDeliveryEta = async (newEta: string) => {
    const cleanEta = newEta.trim();
    if (!cleanEta) return;
    setIsUpdatingDeliveryEta(true);
    setDeliveryEta(cleanEta);
    try {
      localStorage.setItem('ydo_online_delivery_time', cleanEta);
    } catch { }

    try {
      const sanitizedEta = cleanEta.replace(/\s+/g, '_');
      const baseTag = isStoreOpen ? 'dashboard:reg_off:store_open' : 'dashboard:reg_off:store_closed';
      const redirectTag = `${baseTag}:eta_${sanitizedEta}`;

      await supabase
        .from('profiles')
        .update({
          default_redirect_view: redirectTag,
          ecommerce_delivery_time: cleanEta,
          updated_at: new Date().toISOString()
        })
        .eq('role', 'Owner');

      // Also notify backend server store status if active
      try {
        await fetch(`${BACKEND_BASE}/ecommerce/admin/store-status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_open: isStoreOpen,
            delivery_time: cleanEta
          })
        });
      } catch { }

      showToast(`⚡ Delivery Time updated to "${cleanEta}". E-Commerce app synced live!`);
      setIsEtaModalOpen(false);
    } catch (err) {
      console.warn('Failed to update delivery time:', err);
      showToast('❌ Failed to update delivery time in database.');
    } finally {
      setIsUpdatingDeliveryEta(false);
    }
  };

  // Toggle store open/closed state while preserving Delivery ETA tag
  const handleToggleStoreOpen = async () => {
    setIsUpdatingStoreStatus(true);
    const nextState = !isStoreOpen;
    setIsStoreOpen(nextState);
    try {
      localStorage.setItem('ydo_online_store_open', String(nextState));
    } catch { }

    try {
      const sanitizedEta = deliveryEta.replace(/\s+/g, '_');
      const baseTag = nextState ? 'dashboard:reg_off:store_open' : 'dashboard:reg_off:store_closed';
      const redirectTag = `${baseTag}:eta_${sanitizedEta}`;

      await supabase
        .from('profiles')
        .update({
          default_redirect_view: redirectTag,
          ecommerce_delivery_time: deliveryEta,
          updated_at: new Date().toISOString()
        })
        .eq('role', 'Owner');
    } catch (e) {
      console.warn('Failed to sync store status to profiles:', e);
    } finally {
      setIsUpdatingStoreStatus(false);
    }

    showToast(
      nextState
        ? '🟢 Online Store is now OPEN. Customers can place orders!'
        : '🔴 Online Store is now CLOSED. Customer app shows "Shop is Closed"!'
    );
  };

  // Document title alert so cashier sees order when in another tab
  useEffect(() => {
    const originalTitle = document.title;
    const pendingCount = orders.filter((o) => o.order_status === 'PLACED').length;
    if (pendingCount > 0) {
      document.title = `(🔔 ${pendingCount} New Order${pendingCount > 1 ? 's' : ''}) Yogeshwari Dairy`;
    } else {
      if (document.title.includes('🔔')) {
        document.title = 'Yogeshwari Dairy Shop Inventory';
      }
    }
    return () => {
      document.title = originalTitle;
    };
  }, [orders]);

  // Keyboard shortcut listener for quick thermal slip printing
  useEffect(() => {
    if (!receiptOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReceiptOrder(null);
      } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receiptOrder]);

  // Toggle sound
  const handleToggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ydo_order_audio_enabled', String(next));
      } catch { }
      if (next) {
        unlockAudio();
      }
      return next;
    });
  };

  // Request system notification permissions for alerts when app is closed / backgrounded
  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      showToast('✅ Background push notifications enabled! (Alerts will ring even if app is closed)');
    } else {
      showToast('⚠️ Please allow notification permission in your browser or phone settings');
    }
  };

  // One-click Confirm & Prepare: Updates status to CONFIRMED and opens thermal delivery slip directly
  const handleConfirmAndPrepare = async (order: EcommerceOrder) => {
    await handleUpdateStatus(order.id, 'CONFIRMED');
    setReceiptOrder({ ...order, order_status: 'CONFIRMED' });
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
        setOrders((prev) => {
          const next = prev.map((ord) => (ord.id === orderId ? { ...ord, ...updates } : ord));
          const stillHasUnaccepted = next.some((o) => o.order_status === 'PLACED');
          if (!stillHasUnaccepted) {
            stopBlinkitOrderAlarm();
          }
          return next;
        });
        if (newStatus === 'DELIVERED') {
          const currentOrder = orders.find((o) => o.id === orderId);
          if (currentOrder) {
            convertOnlineOrderToCompletedSale(currentOrder as any).catch(console.error);
          }
        }
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
          setOrders((prev) => {
            const next = prev.map((ord) =>
              ord.id === cancelModalOrder.id ? { ...ord, ...updates } : ord
            );
            const stillHasUnaccepted = next.some((o) => o.order_status === 'PLACED');
            if (!stillHasUnaccepted) {
              stopBlinkitOrderAlarm();
            }
            return next;
          });
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
          setOrders((prev) => {
            const next = prev.map((ord) =>
              ord.id === cancelModalOrder.id ? { ...ord, ...updates } : ord
            );
            const stillHasUnaccepted = next.some((o) => o.order_status === 'PLACED');
            if (!stillHasUnaccepted) {
              stopBlinkitOrderAlarm();
            }
            return next;
          });
        }
      }
    } catch (e: unknown) {
      showToast(`❌ Cancel error: ${e instanceof Error ? e.message : 'Unknown'}`);
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
    const list = orders.filter((o) => {
      if (activeTab !== 'ALL') {
        if (activeTab === 'CANCELLED') {
          if (o.order_status !== 'CANCELLED' && o.order_status !== 'REJECTED') {
            return false;
          }
        } else if (o.order_status !== activeTab) {
          return false;
        }
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

    if (activeTab === 'ALL') {
      return [...list].sort((a, b) => {
        const aIsCancelled = a.order_status === 'CANCELLED' || a.order_status === 'REJECTED';
        const bIsCancelled = b.order_status === 'CANCELLED' || b.order_status === 'REJECTED';
        if (aIsCancelled && !bIsCancelled) return 1;
        if (!aIsCancelled && bIsCancelled) return -1;
        return 0;
      });
    }

    return list;
  }, [orders, activeTab, searchQuery]);

  // FEFO Batch Recommender for staff order fulfillment
  const getFefoBatchRecommendation = (productId?: string | null) => {
    if (!productId) return null;
    const matchingBatches = batches
      .filter((b) => b.product_id === productId && b.qty_remaining > 0)
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    return matchingBatches[0] || null;
  };

  // Status Badge Helper using shared Design System StatusBadge
  const renderOrderStatusBadge = (status: EcommerceOrderStatus, _isNew: boolean) => {
    switch (status) {
      case 'PLACED':
        return <StatusBadge label="Placed (New)" tone="amber" pulse={true} />;
      case 'CONFIRMED':
        return <StatusBadge label="Confirmed" tone="blue" />;
      case 'PREPARING':
        return <StatusBadge label="Packing" tone="purple" />;
      case 'OUT_FOR_DELIVERY':
        return <StatusBadge label="Out for Delivery" tone="cyan" />;
      case 'DELIVERED':
        return <StatusBadge label="Delivered" tone="emerald" />;
      case 'CANCELLED':
      case 'REJECTED':
        return <StatusBadge label={status === 'REJECTED' ? 'Rejected' : 'Cancelled'} tone="rose" />;
      default:
        return <StatusBadge label={status} tone="slate" />;
    }
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
    <div className="max-w-7xl mx-auto pb-28 lg:pb-10 space-y-2 px-1 sm:px-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* 1. COMPACT 2-ROW HEADER (Matches Stock & POS Architecture) */}
      <div className="space-y-2">
        {/* Row 1: Icon + Title "Online Orders" + Live badge + Store Open/Closed switch + Overflow Menu */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              Online Orders
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Store Open/Closed Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isStoreOpen}
              aria-label={isStoreOpen ? 'Online store is open, tap to close' : 'Online store is closed, tap to open'}
              disabled={isUpdatingStoreStatus}
              onClick={handleToggleStoreOpen}
              className={`h-9 px-3 rounded-full border text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                isStoreOpen
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isStoreOpen ? 'Store: OPEN' : 'Store: CLOSED'}</span>
            </button>

            {/* Overflow Menu */}
            <div className="relative">
              <button
                type="button"
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={isOverflowMenuOpen}
                onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-95 transition-transform cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2A25]"
              >
                <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>

              {isOverflowMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOverflowMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] shadow-xl p-1.5 space-y-1 animate-scale-in text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBannersModalOpen(true);
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Promotional Posters</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBrandLogosModalOpen(true);
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span>Brand Master &amp; Logos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleAudio();
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      {isAudioEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          <span>Mute Order Alarm</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4 text-slate-400" />
                          <span>Unmute Order Alarm</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleViewMode(viewMode === 'cards' ? 'compact' : 'cards');
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      {viewMode === 'cards' ? (
                        <>
                          <List className="w-4 h-4 text-blue-600" />
                          <span>Switch to Compact Table</span>
                        </>
                      ) : (
                        <>
                          <LayoutGrid className="w-4 h-4 text-blue-600" />
                          <span>Switch to Cards View</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        requestNotificationPermission();
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span>Notification Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fetchOrders(false);
                        setIsOverflowMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-700 dark:text-slate-200 text-left cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Refresh Orders</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Delivery time setting chip + Alarm mute button if ringing */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            disabled={isUpdatingDeliveryEta}
            onClick={() => {
              setCustomEtaInput(deliveryEta);
              setIsEtaModalOpen(true);
            }}
            className="h-8 px-3 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 shadow-xs"
            title="Click to edit E-Commerce Delivery Time Promise"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Delivery: {deliveryEta}</span>
            <ChevronDown className="w-3 h-3 text-amber-600/70 shrink-0" />
          </button>

          {isAlarmRinging && (
            <button
              type="button"
              onClick={() => stopBlinkitOrderAlarm()}
              className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md active:scale-95 transition shrink-0 animate-pulse cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5 text-white" />
              <span>Mute Ringing Alarm</span>
            </button>
          )}
        </div>

        {/* Slim dismissible Counter Speaker Alarm Audio Unlock Banner */}
        {!isAudioUnlocked && isAudioEnabled && !isAlarmBannerDismissed && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200/90 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="animate-bounce">🔔</span>
              <span className="truncate">Enable speaker audio for incoming order alerts</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={unlockAudio}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Enable
              </button>
              <button
                type="button"
                aria-label="Dismiss audio prompt"
                onClick={() => setIsAlarmBannerDismissed(true)}
                className="p-1 rounded-md text-amber-700/60 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Summary strip: 4 compact stat tiles in 1 row (Placed, Packing, Out for Delivery, Delivered) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* 1. Placed */}
          <button
            type="button"
            title="Needs Accept"
            onClick={() => setActiveTab(activeTab === 'PLACED' ? 'ALL' : 'PLACED')}
            className={`min-h-[44px] p-2 rounded-xl border flex flex-col justify-center text-left active:scale-95 transition-all cursor-pointer ${
              activeTab === 'PLACED'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/30'
                : 'bg-white dark:bg-[#131F1B] border-slate-200/80 dark:border-[#24352F]'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block truncate">
              Placed
            </span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${counts.PLACED > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {counts.PLACED}
            </span>
          </button>

          {/* 2. Packing */}
          <button
            type="button"
            title="FEFO Picking"
            onClick={() => setActiveTab(activeTab === 'PREPARING' ? 'ALL' : 'PREPARING')}
            className={`min-h-[44px] p-2 rounded-xl border flex flex-col justify-center text-left active:scale-95 transition-all cursor-pointer ${
              activeTab === 'PREPARING' || activeTab === 'CONFIRMED'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/30'
                : 'bg-white dark:bg-[#131F1B] border-slate-200/80 dark:border-[#24352F]'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block truncate">
              Packing
            </span>
            <span className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              {counts.CONFIRMED + counts.PREPARING}
            </span>
          </button>

          {/* 3. Out for Delivery */}
          <button
            type="button"
            title="On the road"
            onClick={() => setActiveTab(activeTab === 'OUT_FOR_DELIVERY' ? 'ALL' : 'OUT_FOR_DELIVERY')}
            className={`min-h-[44px] p-2 rounded-xl border flex flex-col justify-center text-left active:scale-95 transition-all cursor-pointer ${
              activeTab === 'OUT_FOR_DELIVERY'
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30'
                : 'bg-white dark:bg-[#131F1B] border-slate-200/80 dark:border-[#24352F]'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block truncate">
              Out for Delivery
            </span>
            <span className="text-sm sm:text-base font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
              {counts.OUT_FOR_DELIVERY}
            </span>
          </button>

          {/* 4. Delivered */}
          <button
            type="button"
            title="Completed"
            onClick={() => setActiveTab(activeTab === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
            className={`min-h-[44px] p-2 rounded-xl border flex flex-col justify-center text-left active:scale-95 transition-all cursor-pointer ${
              activeTab === 'DELIVERED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-white dark:bg-[#131F1B] border-slate-200/80 dark:border-[#24352F]'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block truncate">
              Delivered
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {counts.DELIVERED}
            </span>
          </button>
        </div>

        {/* Search Bar + status ChipRow */}
        <div className="space-y-1.5 pt-0.5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search #ORD, customer, phone, item..."
          />

          <ChipRow role="tablist" aria-label="Order status filters">
            <FilterChip
              label="All Orders"
              active={activeTab === 'ALL'}
              count={counts.ALL}
              onClick={() => setActiveTab('ALL')}
              role="tab"
              aria-selected={activeTab === 'ALL'}
            />
            <FilterChip
              label="Placed (New)"
              active={activeTab === 'PLACED'}
              count={counts.PLACED}
              countVariant={counts.PLACED > 0 ? 'amber' : 'default'}
              onClick={() => setActiveTab('PLACED')}
              role="tab"
              aria-selected={activeTab === 'PLACED'}
            />
            <FilterChip
              label="Confirmed"
              active={activeTab === 'CONFIRMED'}
              count={counts.CONFIRMED}
              onClick={() => setActiveTab('CONFIRMED')}
              role="tab"
              aria-selected={activeTab === 'CONFIRMED'}
            />
            <FilterChip
              label="Packing"
              active={activeTab === 'PREPARING'}
              count={counts.PREPARING}
              onClick={() => setActiveTab('PREPARING')}
              role="tab"
              aria-selected={activeTab === 'PREPARING'}
            />
            <FilterChip
              label="Out for Delivery"
              active={activeTab === 'OUT_FOR_DELIVERY'}
              count={counts.OUT_FOR_DELIVERY}
              onClick={() => setActiveTab('OUT_FOR_DELIVERY')}
              role="tab"
              aria-selected={activeTab === 'OUT_FOR_DELIVERY'}
            />
            <FilterChip
              label="Delivered"
              active={activeTab === 'DELIVERED'}
              count={counts.DELIVERED}
              onClick={() => setActiveTab('DELIVERED')}
              role="tab"
              aria-selected={activeTab === 'DELIVERED'}
            />
            <FilterChip
              label="Cancelled"
              active={activeTab === 'CANCELLED'}
              count={counts.CANCELLED + counts.REJECTED}
              countVariant={(counts.CANCELLED + counts.REJECTED) > 0 ? 'rose' : 'default'}
              onClick={() => setActiveTab('CANCELLED')}
              role="tab"
              aria-selected={activeTab === 'CANCELLED'}
            />
          </ChipRow>
        </div>
      </div>

      {/* 2. ORDERS MAIN CONTENT (Cards Mode vs Compact Table Mode) */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-10 text-center border border-slate-200 dark:border-[#24352F] shadow-2xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Syncing live orders with Supabase...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-[#24352F] shadow-2xs">
          <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
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
      ) : viewMode === 'compact' ? (
        /* COMPACT POS TABLE VIEW (High-Speed Multi-Order Overview) */
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items Summary</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Stage Action</th>
                  <th className="py-2.5 px-3 text-center">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredOrders.map((order) => {
                  const isPlaced = order.order_status === 'PLACED';
                  const isConfirmed = order.order_status === 'CONFIRMED';
                  const isPreparing = order.order_status === 'PREPARING';
                  const isOutForDelivery = order.order_status === 'OUT_FOR_DELIVERY';
                  const isDelivered = order.order_status === 'DELIVERED';
                  const isNew = newOrderIds.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50 dark:hover:bg-[#1A2A25]/60 transition ${isNew ? 'bg-emerald-50/25 dark:bg-emerald-950/20' : ''
                        }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {isNew && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                          <span>#{order.order_no}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(order.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {order.customer_name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {order.customer_phone}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="truncate text-slate-700 dark:text-slate-300">
                          {order.items?.map((it) => `${it.product_name} (${it.quantity})`).join(', ') || 'No items'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {order.items?.length || 0} unique SKUs
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap text-sm">
                        ₹{order.total_amount}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${order.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                        >
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderStatusBadge(order.order_status)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isPlaced && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus === order.id}
                            onClick={() => handleConfirmAndPrepare(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                          >
                            Accept & Slip
                          </button>
                        )}
                        {isConfirmed && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                          >
                            Start Packing
                          </button>
                        )}
                        {isPreparing && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                          >
                            Dispatch Rider
                          </button>
                        )}
                        {isOutForDelivery && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED', 'PAID')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {isDelivered && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            Completed ✅
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(order)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300"
                            title="Print Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setNavigationOrder(order)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300"
                            title="Route & Map"
                          >
                            <Compass className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RESPONSIVE CARDS GRID VIEW (2 Columns on Desktop, 1 Column on Mobile) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredOrders.map((order) => {
            const isPlaced = order.order_status === 'PLACED';
            const isConfirmed = order.order_status === 'CONFIRMED';
            const isPreparing = order.order_status === 'PREPARING';
            const isOutForDelivery = order.order_status === 'OUT_FOR_DELIVERY';
            const isDelivered = order.order_status === 'DELIVERED';
            const isCancelled = order.order_status === 'CANCELLED' || order.order_status === 'REJECTED';
            const isCod = order.payment_method === 'COD';
            const isPaid = order.payment_status === 'PAID';
            const isNew = newOrderIds.has(order.id) || isPlaced;
            const isExpanded = expandedMap[order.id] !== undefined
              ? expandedMap[order.id]
              : (isPlaced || isConfirmed || isPreparing || isNew);

            const totalItems = order.items?.length || 0;
            const isItemsExpanded = !!expandedItemsMap[order.id];
            const visibleItems = isItemsExpanded ? (order.items || []) : (order.items || []).slice(0, 3);
            const remainingCount = totalItems - 3;

            // WhatsApp link with friendly Marathi/English order greeting
            const waText = encodeURIComponent(
              `Namaste ${order.customer_name}! 🥛\nRegarding your Yogeshwari Dairy Order #${order.order_no} (₹${order.total_amount}):\nStatus: ${order.order_status}\nExpected Delivery: 15-30 mins.\nThank you for shopping with us!`
            );
            const waUrl = `https://wa.me/91${order.customer_phone.replace(/\D/g, '')}?text=${waText}`;

            return (
              <div
                key={order.id}
                className={`rounded-2xl transition-all duration-150 border overflow-hidden ${
                  isCancelled
                    ? 'bg-slate-50/70 dark:bg-[#111916] border-slate-200 dark:border-[#202E28] opacity-80'
                    : isNew
                    ? 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F] border-l-4 border-l-amber-500 shadow-sm'
                    : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F] shadow-xs'
                }`}
              >
                {/* COLLAPSED HEADER (Always visible, tap to toggle) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleOrderExpanded(order.id, isExpanded)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleOrderExpanded(order.id, isExpanded);
                    }
                  }}
                  aria-expanded={isExpanded}
                  className="p-3.5 sm:p-4 cursor-pointer select-none space-y-2 hover:bg-slate-50/60 dark:hover:bg-[#16231E]/60 transition-colors"
                >
                  {/* Row 1: Order # + relative time LEFT, Amount + COD/PAID + Chevron RIGHT */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isNew && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />}
                      <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        #{order.order_no}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {formatTimeAgo(order.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
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
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#1A2A25] flex items-center justify-center text-slate-500 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Customer Name + Phone */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="font-bold truncate">
                      <span>{order.customer_name}</span>
                      <span className="text-slate-400 mx-1.5 font-normal">&bull;</span>
                      <span className="font-mono font-normal text-slate-500 dark:text-slate-400">{order.customer_phone}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {totalItems} items
                    </span>
                  </div>

                  {/* Row 3: Single Status Badge */}
                  <div>
                    {renderOrderStatusBadge(order.order_status, isNew)}
                  </div>
                </div>

                {/* EXPANDED CONTENT */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 border-t border-slate-100 dark:border-[#1E3029] pt-3 space-y-3">
                    {/* 1. Items List (Max 3 lines, then +N more items) */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Order Items ({totalItems})</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold normal-case flex items-center gap-1 text-[10px]">
                          <Layers className="w-3 h-3" /> FEFO Active
                        </span>
                      </div>

                      <div className="space-y-1">
                        {visibleItems.map((item: EcommerceOrderItem) => {
                          const fefoBatch = getFefoBatchRecommendation(item.product_id);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] text-xs border border-slate-100 dark:border-[#223630]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-slate-800 dark:text-white truncate">
                                  {item.product_name}
                                </span>
                                {item.pack_size && (
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    ({item.pack_size})
                                  </span>
                                )}
                                <span className="font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                                  &times; {item.quantity} {item.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {fefoBatch && (
                                  <span
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-mono font-semibold hidden sm:inline"
                                    title={`Batch: ${fefoBatch.batch_no} | Exp: ${fefoBatch.expiry_date}`}
                                  >
                                    Pick: {fefoBatch.batch_no}
                                  </span>
                                )}
                                <span className="font-bold text-slate-900 dark:text-white">
                                  ₹{item.total_price}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {remainingCount > 0 && !isItemsExpanded && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemsExpanded(order.id);
                            }}
                            className="w-full py-1 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            +{remainingCount} more items &darr;
                          </button>
                        )}

                        {isItemsExpanded && remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemsExpanded(order.id);
                            }}
                            className="w-full py-1 text-center text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            Show less &uarr;
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Delivery Address with Route Map button */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#182622] border border-slate-200/70 dark:border-[#24352F]/70 text-xs space-y-1.5">
                      <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                          {order.delivery_address?.addressLine1 || (order.delivery_address as any)?.street || 'Main Road'}
                          {(order.delivery_address as any)?.houseNo ? ` (${(order.delivery_address as any).houseNo})` : ''}
                          {order.delivery_address?.landmark ? ` (Near: ${order.delivery_address.landmark})` : ''}
                          {order.delivery_address?.city ? `, ${order.delivery_address.city}` : ', Ambajogai'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setNavigationOrder(order)}
                          className="h-8 px-2.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/70 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Route Map</span>
                        </button>

                        {/* Call & WhatsApp Quick Buttons */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1 border border-slate-200 dark:border-[#24352F] active:scale-95 transition"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1 border border-emerald-200/80 dark:border-emerald-800/50 active:scale-95 transition"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {order.delivery_notes && (
                        <div className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                          Note: {order.delivery_notes}
                        </div>
                      )}
                    </div>

                    {/* 3. Stage Stepper (for active orders) or Cancel Reason */}
                    {!isCancelled ? (
                      <div className="py-1.5 px-2.5 bg-slate-50 dark:bg-[#1A2A25] rounded-xl border border-slate-100 dark:border-[#24352F]/70">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Stage:</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {order.order_status === 'PLACED' && '1. Placed'}
                            {order.order_status === 'CONFIRMED' && '2. Confirmed'}
                            {order.order_status === 'PREPARING' && '3. Packing'}
                            {order.order_status === 'OUT_FOR_DELIVERY' && '4. Out for Delivery'}
                            {order.order_status === 'DELIVERED' && '5. Delivered'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <div className="h-1.5 rounded-full bg-emerald-500" title="1. Placed" />
                          <div className={`h-1.5 rounded-full transition-all ${['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} title="2. Confirmed" />
                          <div className={`h-1.5 rounded-full transition-all ${['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} title="3. Packing" />
                          <div className={`h-1.5 rounded-full transition-all ${['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} title="4. Out for Delivery" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
                        <div className="font-bold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Order was {order.order_status === 'REJECTED' ? 'Rejected' : 'Cancelled'}</span>
                        </div>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                          Reason: {order.rejection_reason || order.cancellation_reason || 'Order cancelled'}
                        </p>
                      </div>
                    )}

                    {/* 4. Action Buttons (Strictly status-dependent, max ONE primary + up to two secondary) */}
                    {isPlaced && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="h-11 px-4 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleConfirmAndPrepare(order)}
                          className="flex-1 h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Accept & Prepare</span>
                        </button>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="flex-1 h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Package className="w-4 h-4 text-white" />
                          <span>Pack Order</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-[#24352F] cursor-pointer shrink-0 active:scale-95"
                          title="Print Slip"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    )}

                    {isPreparing && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => setAssignRiderOrder(order)}
                          className="flex-1 h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Truck className="w-4 h-4 text-white" />
                          <span>Assign Rider</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackingOrder(order)}
                          className="h-11 w-11 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300 dark:border-emerald-700 cursor-pointer shrink-0 active:scale-95"
                          title="YogiMart Item Scanner"
                        >
                          <Package className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-[#24352F] cursor-pointer shrink-0 active:scale-95"
                          title="Print Slip"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    )}

                    {isOutForDelivery && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED', 'PAID')}
                          className="flex-1 h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Mark Delivered & Paid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNavigationOrder(order)}
                          className="h-11 w-11 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-[#1A2A25] text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-800 cursor-pointer shrink-0 active:scale-95"
                          title="Route Map"
                        >
                          <Compass className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-[#24352F] cursor-pointer shrink-0 active:scale-95"
                          title="Print Slip"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                          <span>Print Delivery Slip</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* THERMAL DELIVERY RECEIPT MODAL (58mm / 80mm) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-3 sm:space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Thermal Delivery Slip
                </h3>
                <p className="text-xs text-slate-500">Order #{receiptOrder.order_no}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200 dark:border-[#24352F]">
                  <button
                    type="button"
                    onClick={() => handleChangeReceiptWidth('58mm')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${receiptWidth === '58mm'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    58mm (2")
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeReceiptWidth('80mm')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${receiptWidth === '80mm'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    80mm (3")
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div
              id="printable-delivery-slip"
              className={`bg-white text-slate-900 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-xs space-y-2 mx-auto shadow-sm ${receiptWidth === '58mm' ? 'receipt-58mm max-w-[280px]' : 'receipt-80mm max-w-[340px]'
                }`}
            >
              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-2">
                <div className="font-bold text-sm text-slate-900">
                  YOGESHWARI DAIRY PRODUCTS
                </div>
                <div className="text-[10px] text-slate-600">
                  Fresh Milk, Paneer, Curd, Pure Ghee
                </div>
                <div className="text-[10px] text-slate-600">
                  Mandi Bazar, Mangalwar Peth Road, near Masjid, Ambajogai - 431517
                </div>
                <div className="text-[9px] text-slate-600">
                  Mo: 093708 69896 / +91 93708 69896 &bull; Daily 6:00 AM - 10:00 PM
                </div>
                <div className="text-[11px] font-black pt-1 uppercase tracking-wider text-emerald-800">
                  ** ONLINE DELIVERY SLIP **
                </div>
              </div>

              {/* Order Metadata */}
              <div className="text-[11px] text-slate-800 space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>Order: #{receiptOrder.order_no}</span>
                  <span>
                    {new Date(receiptOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Date: {new Date(receiptOrder.created_at).toLocaleDateString()}</span>
                  <span>Type: Express Dairy</span>
                </div>
              </div>

              {/* Customer & Address */}
              <div className="border-t border-b border-slate-200 py-1.5 text-[11px] space-y-0.5">
                <div className="font-bold text-slate-900">
                  Customer: {receiptOrder.customer_name}
                </div>
                <div>Phone: {receiptOrder.customer_phone}</div>
                <div className="text-[10px] text-slate-700">
                  Address:{' '}
                  {[
                    (receiptOrder.delivery_address as any)?.addressLine1 || (receiptOrder.delivery_address as any)?.address_line1,
                    (receiptOrder.delivery_address as any)?.addressLine2 || (receiptOrder.delivery_address as any)?.address_line2,
                    (receiptOrder.delivery_address as any)?.landmark ? `(Near: ${(receiptOrder.delivery_address as any).landmark})` : null,
                    (receiptOrder.delivery_address as any)?.city || 'Ambajogai',
                    (receiptOrder.delivery_address as any)?.pincode ? `PIN: ${(receiptOrder.delivery_address as any).pincode}` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {receiptOrder.delivery_notes && (
                  <div className="text-[10px] text-amber-800 font-semibold">
                    Note: {receiptOrder.delivery_notes}
                  </div>
                )}
              </div>

              {/* Itemized Lines */}
              <div className="space-y-1 py-1">
                <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <span>QTY &times; RATE = TOTAL</span>
                </div>
                {receiptOrder.items?.map((it, idx) => (
                  <div key={idx} className="space-y-0.5 text-[11px] text-slate-800">
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
              <div className="border-t border-slate-200 pt-1.5 space-y-0.5 text-right font-bold text-xs">
                <div className="flex justify-between text-[11px] text-slate-600 font-normal">
                  <span>Subtotal:</span>
                  <span>₹{receiptOrder.subtotal || receiptOrder.total_amount}</span>
                </div>
                {receiptOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600 font-normal">
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
                <div className="flex justify-between text-sm text-emerald-700 font-black border-t border-dashed border-slate-300 pt-1">
                  <span>NET PAYABLE:</span>
                  <span>₹{receiptOrder.total_amount}</span>
                </div>
                <div className="text-[10px] font-normal text-slate-600 pt-0.5">
                  Payment: {receiptOrder.payment_method} &bull; {receiptOrder.payment_status}
                  {receiptOrder.payment_method === 'COD' && receiptOrder.payment_status !== 'PAID' && (
                    <div className="font-bold text-rose-600 text-[11px] mt-0.5">
                      *** COLLECT CASH: ₹{receiptOrder.total_amount} ***
                    </div>
                  )}
                  {receiptOrder.payment_status === 'PAID' && (
                    <div className="font-bold text-emerald-700 text-[11px] mt-0.5">
                      *** PAID ONLINE ***
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-3 border-t border-slate-200 text-[9px] text-slate-600 flex justify-between">
                <div>Delivery Partner Sign</div>
                <div>Customer Sign</div>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-1">
                Thank you! Fresh dairy delivered directly from shop.
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-100" />
                <span>Print Delivery Slip ({receiptWidth})</span>
                <span className="text-[10px] opacity-75 font-normal hidden sm:inline">(Enter / Ctrl+P)</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT / CANCEL ORDER MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-3 sm:space-y-4 max-h-[92vh] overflow-y-auto">
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

      {/* IN-APP DELIVERY MAP & TURN NAVIGATION MODAL */}
      {navigationOrder && (
        <DeliveryNavigationModal
          order={navigationOrder}
          onClose={() => setNavigationOrder(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* ASSIGN DELIVERY RIDER MODAL */}
      {assignRiderOrder && (
        <AssignRiderModal
          isOpen={Boolean(assignRiderOrder)}
          onClose={() => setAssignRiderOrder(null)}
          orderId={assignRiderOrder.id}
          orderNumber={assignRiderOrder.order_no}
          customerName={assignRiderOrder.customer_name}
          currentRiderName={assignRiderOrder.delivery_partner_name}
          currentRiderPhone={assignRiderOrder.delivery_partner_phone}
          currentRiderVehicle={assignRiderOrder.delivery_partner_vehicle}
          onRiderAssigned={(rider) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === assignRiderOrder.id
                  ? {
                    ...o,
                    delivery_partner_name: rider.rider_name,
                    delivery_partner_phone: rider.rider_phone,
                    delivery_partner_vehicle: rider.rider_vehicle,
                    delivery_notes: rider.notes || o.delivery_notes,
                  }
                  : o
              )
            );
            showToast(`🛵 Assigned ${rider.rider_name} to Order #${assignRiderOrder.order_no}`);
          }}
        />
      )}

      {/* BLINKIT / YOGIMART ORDER PACKING & BARCODE VERIFICATION MODAL */}
      {packingOrder && (
        <BlinkitOrderPackingModal
          isOpen={Boolean(packingOrder)}
          onClose={() => setPackingOrder(null)}
          order={packingOrder as any}
          onOrderUpdated={(updated) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
            showToast(`📦 Packing progress updated for Order #${packingOrder.order_no}`);
          }}
        />
      )}

      {/* EDIT E-COMMERCE DELIVERY TIME / ETA PROMISE MODAL */}
      {isEtaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-[#131F1B] rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight">
                    Delivery Time Promise
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live customer app will display this delivery promise
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEtaModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2E28] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  ⚡ Quick Presets (1-Tap Select):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { eta: '10-15 mins', tag: 'Super Express', desc: 'Light rush, immediate dispatch' },
                    { eta: '15-25 mins', tag: 'Express Dairy', desc: 'Standard fast delivery (Default)' },
                    { eta: '20-30 mins', tag: 'Standard', desc: 'Regular city delivery' },
                    { eta: '30-45 mins', tag: 'High Rush', desc: 'Peak counter hours / bad weather' },
                    { eta: '45-60 mins', tag: 'Peak Evening', desc: 'High order volume' },
                  ].map((preset) => {
                    const isSelected = deliveryEta.toLowerCase() === preset.eta.toLowerCase();
                    return (
                      <button
                        key={preset.eta}
                        type="button"
                        disabled={isUpdatingDeliveryEta}
                        onClick={() => handleSaveDeliveryEta(preset.eta)}
                        className={`p-2.5 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30'
                            : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#2A3E37] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm tracking-tight">{preset.eta}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  ✏️ Or enter custom delivery time:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEtaInput}
                    onChange={(e) => setCustomEtaInput(e.target.value)}
                    placeholder="e.g. 15-20 mins, Within 25 mins"
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2A3E37] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                  <button
                    type="button"
                    disabled={isUpdatingDeliveryEta || !customEtaInput.trim()}
                    onClick={() => handleSaveDeliveryEta(customEtaInput)}
                    className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingDeliveryEta ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Realtime broadcast reassurance card */}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                <p>
                  <strong>Instant Live Broadcast:</strong> Automatically updates the customer web app (Header, Delivery Banners, Cart Drawer & Tracking) in real-time without reloading!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTIONAL BANNERS / POSTERS MODAL */}
      <PromotionalBannersModal
        isOpen={isBannersModalOpen}
        onClose={() => setIsBannersModalOpen(false)}
      />

      {/* BRAND MASTER & LOGOS MANAGER MODAL */}
      <BrandLogoManagerModal
        isOpen={isBrandLogosModalOpen}
        onClose={() => setIsBrandLogosModalOpen(false)}
      />
    </div>
  );
};
