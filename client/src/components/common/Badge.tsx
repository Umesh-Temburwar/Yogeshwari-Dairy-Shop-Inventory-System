import React from 'react';

interface BadgeProps {
  type: 'stock' | 'expiry' | 'role';
  value: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value }) => {
  if (type === 'stock') {
    switch (value) {
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Out of Stock
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Low Stock
          </span>
        );
      case 'OVERSTOCK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Overstock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            In Stock
          </span>
        );
    }
  }

  if (type === 'expiry') {
    switch (value) {
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm">
            Expired (Blocked)
          </span>
        );
      case 'EXPIRING_TODAY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            Expiring Today!
          </span>
        );
      case 'EXPIRING_TOMORROW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
            Expiring Tomorrow
          </span>
        );
      case 'EXPIRING_IN_3_DAYS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-900 border border-yellow-300">
            Expiring in 3 Days
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Fresh
          </span>
        );
    }
  }

  // Role Badge
  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    owner: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    cashier: 'bg-teal-100 text-teal-800 border-teal-200',
    delivery_boy: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
        roleColors[value] || 'bg-slate-100 text-slate-800 border-slate-200'
      }`}
    >
      {value.replace('_', ' ')}
    </span>
  );
};

