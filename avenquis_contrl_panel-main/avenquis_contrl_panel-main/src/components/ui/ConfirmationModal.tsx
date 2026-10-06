/**
 * ConfirmationModal & DetailsDrawer - Enterprise dialogs and slide-over inspectors
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../utils/motion';
import { X, AlertTriangle, ShieldAlert, Check } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  auditReasonPlaceholder?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'danger',
  requireReason = false,
  reasonPlaceholder = 'Please specify reason for platform audit records...',
  auditReasonPlaceholder,
  isLoading = false,
  children,
}) => {
  const [reason, setReason] = useState('');
  const effectiveConfirmLabel = confirmText || confirmLabel;
  const effectivePlaceholder = auditReasonPlaceholder || reasonPlaceholder;

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (requireReason && !reason.trim());

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#0E1A14]/65 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="relative bg-[#FAF8F3] border border-[#DDD5C7] rounded-xl shadow-2xl max-w-lg w-full p-6 z-10 space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  variant === 'danger' && 'bg-[#FCE8E7] text-[#C5302C]',
                  variant === 'warning' && 'bg-[#FAF4E6] text-[#C59B27]',
                  variant === 'primary' && 'bg-[#EAF3ED] text-[#144A32]'
                )}
              >
                {variant === 'danger' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : variant === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-serif font-semibold text-[#11241C] tracking-tight">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-xs text-[#52635B] leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-md text-[#7A8A82] hover:text-[#11241C] hover:bg-[#EDE7DC] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {children && <div className="py-1 space-y-3">{children}</div>}

            {requireReason && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#52635B]">
                  Mandatory Governance Justification
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={effectivePlaceholder}
                  className="w-full text-xs p-2.5 bg-[#F4EFE6] border border-[#DDD5C7] rounded-md text-[#182620] placeholder:text-[#8E9C95] focus:outline-none focus:border-[#143D2D] focus:ring-1 focus:ring-[#143D2D]"
                />
              </div>
            )}

            <div className="pt-3 border-t border-[#EDE7DC] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-3.5 py-1.5 text-xs font-medium text-[#465750] hover:text-[#182620] hover:bg-[#EAE4D7] rounded-md border border-[#DDD5C7] transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => onConfirm(reason)}
                disabled={isConfirmDisabled}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium rounded-md text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer',
                  variant === 'danger'
                    ? 'bg-[#A82824] hover:bg-[#8F201D] disabled:opacity-50'
                    : variant === 'warning'
                    ? 'bg-[#B08518] hover:bg-[#967011] disabled:opacity-50'
                    : 'bg-[#143D2D] hover:bg-[#0E2C20] disabled:opacity-50'
                )}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {effectiveConfirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = 'lg',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#0E1A14]/60 backdrop-blur-2xs"
            onClick={onClose}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className={cn(
                'pointer-events-auto w-screen bg-[#FAF8F3] border-l border-[#DDD5C7] shadow-2xl flex flex-col',
                widthClasses[width]
              )}
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#E3DDD2] bg-[#F3EDE2] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-serif font-semibold text-[#11241C] tracking-tight">
                      {title}
                    </h2>
                    {badge}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-[#52635B] font-mono leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-[#7A8A82] hover:text-[#182620] hover:bg-[#E2DACB] transition-colors cursor-pointer"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {children}
              </div>

              {/* Drawer Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-[#E3DDD2] bg-[#F2EDE2] flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
