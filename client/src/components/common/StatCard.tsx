import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'emerald',
}) => {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-500',
      iconText: 'text-white',
      accent: 'text-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      iconText: 'text-white',
      accent: 'text-amber-700',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      iconBg: 'bg-rose-500',
      iconText: 'text-white',
      accent: 'text-rose-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-500',
      iconText: 'text-white',
      accent: 'text-blue-700',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-500',
      iconText: 'text-white',
      accent: 'text-purple-700',
    },
  }[variant];

  return (
    <div className={`p-5 rounded-xl border bg-white shadow-sm flex items-start justify-between transition hover:shadow-md`}>
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${variantStyles.iconBg} ${variantStyles.iconText} shadow-sm`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

