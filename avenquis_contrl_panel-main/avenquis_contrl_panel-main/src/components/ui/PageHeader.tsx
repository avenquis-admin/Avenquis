/**
 * PageHeader & MetricCard & AlertBanner - Foundation Layout UI
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className,
}) => {
  return (
    <header className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EFE9DF]', className)}>
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-1">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#D1D5DB]">/</span>}
                <span className={cn(idx === breadcrumbs.length - 1 ? 'text-[#143D2D] font-medium' : 'hover:text-[#11241C]')}>
                  {bc.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3.5 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-serif font-normal tracking-tight text-[#11241C]">
            {title}
          </h1>
          {badge && <div className="inline-flex">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-[#52635B] max-w-2xl font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  sublabel?: string;
  icon?: React.ReactNode;
  accent?: 'forest' | 'gold' | 'charcoal' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  trend = 'neutral',
  sublabel,
  icon,
  accent = 'neutral',
  onClick,
  className,
}) => {
  const accentCardStyles = {
    forest: 'bg-[#F4F8F5] border-[#DCE8E0] hover:border-[#143D2D]/40',
    gold: 'bg-[#FDFBF7] border-[#EFE5D0] hover:border-[#C59A4E]/40',
    charcoal: 'bg-[#FAF9F7] border-[#E5DFD4] hover:border-[#9CA3AF]',
    neutral: 'bg-white border-[#EFE9DF] hover:border-[#D5CDC0]',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-5 border transition-all duration-200 shadow-2xs',
        accentCardStyles[accent],
        onClick && 'cursor-pointer hover:shadow-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#6B7280]">
          {label}
        </span>
        {icon && (
          <span className="w-8 h-8 rounded-xl bg-white/80 border border-[#EFE9DF] text-[#143D2D] flex items-center justify-center shrink-0 shadow-2xs">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl md:text-3xl font-serif font-normal tracking-tight text-[#11241C]">
          {value}
        </span>
      </div>

      {(change || sublabel) && (
        <div className="mt-3.5 pt-3 border-t border-[#EFE9DF]/80 flex items-center justify-between text-xs text-[#6B7280]">
          {change && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium text-[11px] px-2 py-0.5 rounded-full',
                trend === 'up' && 'text-[#14472F] bg-[#EAF3ED] border border-[#D5E8DD]',
                trend === 'down' && 'text-[#942B28] bg-[#FAECEC] border border-[#F5D3D3]',
                trend === 'neutral' && 'text-[#4B5563] bg-[#F3EFE6] border border-[#E5DFD3]'
              )}
            >
              {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-[#1D734E]" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-[#DC2626]" />}
              {trend === 'neutral' && <Minus className="w-3 h-3 text-[#6B7280]" />}
              {change}
            </span>
          )}
          {sublabel && <span className="text-[11px] truncate max-w-[170px] text-[#6B7280]">{sublabel}</span>}
        </div>
      )}
    </div>
  );
};

interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  onDismiss,
  action,
  className,
}) => {
  const styles = {
    info: 'bg-[#F2F6F8] border-[#CFE1E9] text-[#1C4251]',
    success: 'bg-[#EFF6F1] border-[#C7E3D0] text-[#14472F]',
    warning: 'bg-[#FCF7EB] border-[#EDE0BE] text-[#694E15]',
    danger: 'bg-[#FDF2F2] border-[#F2C9C8] text-[#7A1D1B]',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-[#2B6D87] shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-[#1E744D] shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#B88B27] shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-4 h-4 text-[#BF322F] shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'border rounded-2xl p-4 flex items-start gap-3.5 text-sm transition-all shadow-2xs',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <div className="flex-1 space-y-0.5">
        {title && <h4 className="font-semibold text-xs uppercase tracking-wider">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-95">{message}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 p-1 -mr-1 -mt-1 rounded-lg transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
