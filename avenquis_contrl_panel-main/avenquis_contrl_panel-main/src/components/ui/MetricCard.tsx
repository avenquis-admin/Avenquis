/**
 * Avenquis Control Panel - Executive Metric Card Primitive
 * Displays KPI values, percentage trend indicators, and refined accents.
 */

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AnimatedMetricValue } from './AnimatedMetricValue';
import { EASE_OUT } from '../../utils/motion';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  accent?: 'forest' | 'gold' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  change,
  trend,
  icon,
  accent = 'forest',
  className,
}) => {
  const accentStyles = {
    forest: 'border-l-4 border-l-[#143D2D]',
    gold: 'border-l-4 border-l-[#C5A869]',
    neutral: 'border-l-4 border-l-[#8F9E96]',
  };

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.22, ease: EASE_OUT } }}
      className={cn(
        'bg-[#FAF8F3] border border-[#DDD5C7] rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md relative overflow-hidden transition-all hover:border-[#C5BBAA]',
        accentStyles[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#63736B] font-medium">
          {label}
        </span>
        {icon && (
          <div className="p-1.5 rounded-md bg-[#F2EDE2] text-[#143D2D] border border-[#E0D7C6]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-serif font-semibold text-[#11241C] tracking-tight">
          <AnimatedMetricValue value={value} />
        </span>
      </div>

      {(change || sublabel) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          {sublabel && (
            <span className="text-[#7A8A82] text-[11px] truncate">{sublabel}</span>
          )}

          {change && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[11px] font-semibold shrink-0',
                trend === 'up' && 'text-[#144A32]',
                trend === 'down' && 'text-[#8A1F1D]',
                trend === 'neutral' && 'text-[#63736B]'
              )}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{change}</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
