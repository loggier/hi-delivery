import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ToneKey } from '../_lib/view-model';

const pillTone: Record<ToneKey, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-red-200 bg-red-50 text-red-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
};

export interface StatusPillProps {
  tone: ToneKey;
  children: ReactNode;
  className?: string;
}

export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold', pillTone[tone], className)}>
      {children}
    </span>
  );
}
