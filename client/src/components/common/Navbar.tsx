import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from './Badge.js';
import { UserRole } from '../../types/index.js';
import {
  Menu,
  LogOut,
  Milk,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, role, logout, switchDevRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const availableRoles: { role: UserRole; label: string }[] = [
    { role: 'admin', label: 'Admin (Full Access)' },
    { role: 'owner', label: 'Owner (Sales & Reports)' },
    { role: 'manager', label: 'Manager (Inventory & Purchases)' },
    { role: 'cashier', label: 'Cashier (Billing & Products)' },
    { role: 'delivery_boy', label: 'Delivery Boy (Deliveries Only)' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-0.5 border-2 border-emerald-500/40 shadow-sm overflow-hidden shrink-0">
            <img src="/YDO_logo.jpg" alt="Yogeshwari Dairy Logo" className="h-full w-full rounded-full object-cover scale-105" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                YOGESHWARI DAIRY
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                PHASE 1
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Inventory & Shop Management System
            </p>
          </div>
        </div>
      </div>

      {/* Right: Role Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Role Switcher Pill for Demo */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Role:</span>
            {role && <Badge type="role" value={role} />}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-100 bg-white p-2 shadow-xl z-50 animate-fadeIn">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Role (RBAC Demo)
              </div>
              <div className="py-1 space-y-0.5">
                {availableRoles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchDevRole(r.role);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                      role === r.role
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{r.label}</span>
                    {role === r.role && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-bold text-slate-800">{user?.fullName || 'Staff User'}</span>
          <span className="text-[11px] text-slate-400">{user?.email}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-medium hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

