import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: 'brand' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  brand: { bg: 'bg-brand-50', icon: 'text-brand-600', darkBg: 'dark:bg-brand-900/30', darkIcon: 'dark:text-brand-400' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkIcon: 'dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkIcon: 'dark:text-amber-400' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkIcon: 'dark:text-rose-400' },
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.darkBg}`}>
          <Icon className={`h-6 w-6 ${c.icon} ${c.darkIcon}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`text-xs font-semibold ${
              trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
}
