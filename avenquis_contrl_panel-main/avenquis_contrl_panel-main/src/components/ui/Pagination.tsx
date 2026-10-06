/**
 * Pagination - Clean dense tabular pagination component
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E3DDD2] bg-[#FAF8F3] text-xs text-[#52635B]',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="font-mono text-[#182620]">{startItem}</strong> to{' '}
          <strong className="font-mono text-[#182620]">{endItem}</strong> of{' '}
          <strong className="font-mono text-[#182620]">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="ml-3 flex items-center gap-1.5">
            <span className="text-[11px] text-[#788880]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#F2ECE2] border border-[#DDD5C7] rounded px-2 py-0.5 text-xs text-[#182620] focus:outline-none focus:border-[#143D2D]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#DDD5C7] bg-[#F4EFE6] text-[#22362E] hover:bg-[#EAE3D6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </motion.button>

        <span className="px-2 font-mono text-xs">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#DDD5C7] bg-[#F4EFE6] text-[#22362E] hover:bg-[#EAE3D6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
};
