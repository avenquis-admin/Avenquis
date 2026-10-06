/**
 * DateDisplay & ActivityRow - Audit, event, and timestamp primitives
 */

import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { StatusBadge, RoleBadge } from './StatusBadge';
import { ChevronDown, ChevronUp, Clock, Globe, Shield, User } from 'lucide-react';
import { AuditEvent } from '../../types';

interface DateDisplayProps {
  date: string;
  format?: 'relative' | 'short' | 'full';
  showIcon?: boolean;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'relative',
  showIcon = false,
  className,
}) => {
  const formatted =
    format === 'relative'
      ? formatRelativeTime(date)
      : format === 'full'
      ? formatDateTime(date)
      : formatDate(date);

  return (
    <span
      title={formatDateTime(date)}
      className={cn('inline-flex items-center gap-1.5 font-mono text-xs text-[#52635B]', className)}
    >
      {showIcon && <Clock className="w-3 h-3 text-[#7A8A82]" />}
      <span>{formatted}</span>
    </span>
  );
};

interface ActivityRowProps {
  event: AuditEvent;
  compact?: boolean;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({ event, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-[#E3DDD2] rounded-lg bg-[#FAF8F3] hover:border-[#CFC5B2] transition-colors overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none',
          isExpanded && 'bg-[#F3ECE0]'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#EAE3D4] text-[#143D2D] flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-xs text-[#11241C]">{event.actor}</span>
              <RoleBadge role={event.actorRole} size="sm" />
              <span className="text-[11px] text-[#7A8A82]">•</span>
              <span className="font-mono text-xs font-semibold text-[#143D2D]">
                {event.action}
              </span>
            </div>

            <p className="text-xs text-[#52635B] truncate max-w-xl mt-0.5">
              {event.targetEntity}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end text-right">
            <DateDisplay date={event.timestamp} format="relative" />
            <span className="text-[10px] font-mono text-[#7A8A82] flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              {event.ipAddress.split(' ')[0]}
            </span>
          </div>

          <StatusBadge
            status={event.severity === 'security' ? 'critical' : event.severity === 'warning' ? 'warning' : 'healthy'}
            size="sm"
          />

          <button
            type="button"
            className="p-1 text-[#7A8A82] hover:text-[#11241C]"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-3 bg-[#F0EAE0] border-t border-[#E0D7C6] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#55665E]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#143D2D]" />
              Cryptographic Audit Signature: <code className="font-mono text-[#11241C]">{event.id}</code>
            </span>
            <span className="font-mono">{formatDateTime(event.timestamp)}</span>
          </div>

          <div className="bg-[#FAF8F3] border border-[#DDD5C7] rounded p-2.5 font-mono text-[11px] text-[#1E2923] overflow-x-auto">
            <pre>{JSON.stringify(event.detailsPayload, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
