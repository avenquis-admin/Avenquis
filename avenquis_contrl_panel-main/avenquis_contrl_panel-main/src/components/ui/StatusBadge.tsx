/**
 * StatusBadge & RoleBadge - High-trust enterprise status indicators
 */

import React from 'react';
import { motion } from 'motion/react';
import { StatusVariant, PlatformRole } from '../../types';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../utils/motion';

interface StatusBadgeProps {
  status: StatusVariant | string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', pulse = false }) => {
  const normalized = (status || '').toLowerCase();

  let styles = 'bg-[#F3EFE6] text-[#4B5563] border-[#E4DFD5]';
  let dotColor = 'bg-[#9CA3AF]';
  let label = status;

  switch (normalized) {
    case 'active':
    case 'approved':
    case 'healthy':
    case 'paid':
    case 'completed':
      styles = 'bg-[#EAF3ED] text-[#14472F] border-[#D5E8DD]';
      dotColor = 'bg-[#1D734E]';
      break;

    case 'pending':
    case 'reviewing':
    case 'investigating':
    case 'discovery scheduled':
    case 'new request':
      styles = 'bg-[#FEF6E4] text-[#8D6816] border-[#F4E2B5]';
      dotColor = 'bg-[#C59A4E]';
      break;

    case 'warning':
    case 'security review':
    case 'disputed':
      styles = 'bg-[#FDF2E9] text-[#9A4917] border-[#F8DCBF]';
      dotColor = 'bg-[#DD6B20]';
      break;

    case 'critical':
    case 'critical (p1)':
    case 'overdue':
    case 'failed':
    case 'rejected':
    case 'suspended':
      styles = 'bg-[#FAECEC] text-[#942B28] border-[#F5D3D3]';
      dotColor = 'bg-[#DC2626]';
      break;

    case 'enterprise':
    case 'enterprise custom':
    case 'tier 1':
      styles = 'bg-[#FAF5EC] text-[#7A5B1F] border-[#EADFC7]';
      dotColor = 'bg-[#C59A4E]';
      break;

    default:
      styles = 'bg-[#F3EFE6] text-[#4B5563] border-[#E4DFD5]';
      dotColor = 'bg-[#9CA3AF]';
      break;
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        styles
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <motion.span
            animate={{ opacity: [0.75, 0.2, 0.75], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className={cn('absolute inline-flex h-full w-full rounded-full', dotColor)}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColor)} />
      </span>
      {label}
    </motion.span>
  );
};

interface RoleBadgeProps {
  role: PlatformRole | string;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSuperAdmin = role === 'PLATFORM_SUPER_ADMIN';
  const isAuditor = role === 'PLATFORM_AUDITOR';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium tracking-wide border rounded-lg font-mono',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        isSuperAdmin
          ? 'bg-[#143D2D] text-[#E5D29E] border-[#1D4A38] shadow-2xs font-semibold'
          : isAuditor
          ? 'bg-[#1F2937] text-[#E5E7EB] border-[#374151]'
          : 'bg-[#FAF8F3] text-[#374151] border-[#E4DFD5]'
      )}
    >
      {isSuperAdmin && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#C59A4E]" />
      )}
      {role.replace(/_/g, ' ')}
    </span>
  );
};
