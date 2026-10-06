/**
 * EmptyState & ErrorState - High-clarity fallback displays
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { Inbox, AlertOctagon, RotateCw, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-dashed border-[#DDD5C7] rounded-xl bg-[#FAF8F3]/60 text-center flex flex-col items-center justify-center',
        compact ? 'p-6' : 'p-12',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#EFE9DD] text-[#143D2D] flex items-center justify-center mb-3.5 shadow-2xs">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h3 className="text-base font-semibold text-[#182620] tracking-tight">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#63736B] max-w-md leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3 flex-wrap justify-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load platform data',
  message = 'An unexpected service response or network timeout occurred while querying platform telemetry.',
  errorCode = 'ERR_PLATFORM_API_TIMEOUT',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-[#F2C9C8] rounded-xl bg-[#FDF7F7] p-8 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-[#FCE8E7] text-[#C5302C] flex items-center justify-center mb-3">
        <AlertOctagon className="w-5 h-5 stroke-[1.75]" />
      </div>

      <h3 className="text-base font-semibold text-[#661816]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#7A3634] max-w-md leading-relaxed">
        {message}
      </p>

      {errorCode && (
        <div className="mt-3 px-2 py-0.5 rounded bg-[#F8DFDE] text-[#6E1C1A] text-[11px] font-mono border border-[#ECC2C0]">
          Code: {errorCode}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#8C2320] hover:bg-[#731D1A] text-white text-xs font-medium transition-colors shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry Request
          </button>
        )}
        <a
          href="#support-escalation"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = 'support';
          }}
          className="inline-flex items-center gap-1 text-xs text-[#7A3634] hover:text-[#521210] hover:underline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Escalate to SRE Lead
        </a>
      </div>
    </div>
  );
};
