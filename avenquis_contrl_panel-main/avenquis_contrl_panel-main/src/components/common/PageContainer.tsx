/**
 * Avenquis Control Panel - Standardized Page Container
 * Ensures every section has:
 * - correct page title & subtitle
 * - appropriate toolbar area
 * - interactive state switcher (Ready, Loading, Empty, Error)
 * - seamless placeholder content regions
 */

import React from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '../ui/PageHeader';
import { RotateCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  pageEntranceVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '../../utils/motion';

interface PageContainerProps {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  toolbarActions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  metricsRegion?: React.ReactNode;
  filterRegion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  badge,
  breadcrumbs,
  toolbarActions,
  metricsRegion,
  filterRegion,
  children,
  className,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <motion.div
      variants={pageEntranceVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {/* Header Section */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            {toolbarActions}
            {onRefresh && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                className="p-2 rounded-xl border border-[#E4DFD5] bg-white text-[#6B7280] hover:text-[#11241C] hover:border-[#143D2D] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                title="Refresh section data"
                aria-label="Refresh section data"
              >
                <RotateCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </motion.button>
            )}
          </div>
        }
      />

      {/* Content Container */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {metricsRegion && (
          <motion.div variants={staggerItemVariants}>
            {metricsRegion}
          </motion.div>
        )}
        {filterRegion && (
          <motion.div variants={staggerItemVariants}>
            {filterRegion}
          </motion.div>
        )}
        <motion.div variants={staggerItemVariants}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
