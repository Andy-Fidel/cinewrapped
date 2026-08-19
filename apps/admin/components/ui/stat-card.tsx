import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  colorVariant?: 'red' | 'emerald' | 'amber' | 'blue' | 'purple';
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  colorVariant = 'red',
}: StatCardProps) {
  const iconGradients = {
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <Card className="relative overflow-hidden group hover:border-zinc-700/80 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
          <h4 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </h4>
          {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={clsx(
                  'font-bold',
                  trend.isPositive ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-zinc-500">vs previous period</span>
            </div>
          )}
        </div>
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner transition-transform group-hover:scale-105',
            iconGradients[colorVariant],
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
