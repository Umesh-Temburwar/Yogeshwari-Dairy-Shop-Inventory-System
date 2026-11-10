import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/index.js';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  Boxes,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'owner', 'manager', 'cashier'],
  },
  {
    name: 'Products & Catalog',
    href: '/products',
    icon: Package,
    roles: ['admin', 'owner', 'manager', 'cashier'],
  },
  {
    name: 'Stock & Batches',
    href: '/stock',
    icon: Boxes,
    roles: ['admin', 'owner', 'manager', 'cashier'],
    badge: 'FEFO',
  },
  {
    name: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
    roles: ['admin', 'owner', 'manager'],
  },
  {
    name: 'Categories & Units',
    href: '/masters',
    icon: Layers,
    roles: ['admin', 'owner', 'manager'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole, role } = useAuth();

  // Filter navigation items strictly based on user's active role
  const visibleItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-extrabold text-lg tracking-wider">
              YOGESHWARI
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Phase 1 Modules
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {visibleItems.length === 0 && (
            <div className="p-4 rounded-lg bg-slate-800 text-xs text-slate-400">
              Role <span className="text-white font-bold">{role}</span> has limited Phase 1 permissions. Use the top menu to switch to Admin/Manager to see catalog management.
            </div>
          )}
        </div>

        {/* Footer info box */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 m-3 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>FEFO & Batch Logic Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Near-expiry items prioritised automatically. Expired batches blocked from billing.
          </p>
        </div>
      </aside>
    </>
  );
};

