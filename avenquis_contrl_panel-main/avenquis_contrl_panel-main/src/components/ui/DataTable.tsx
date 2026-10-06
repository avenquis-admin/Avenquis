/**
 * DataTable - Production enterprise admin table with density toggle, sorting, selection
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { TableSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyMessage?: string;
  dense?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyTitle,
  emptyDescription = 'There are no active records matching the selected parameters or filter criteria.',
  emptyMessage,
  dense = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  pagination,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(keyExtractor));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={dense ? 8 : 5} columns={columns.length + (selectable ? 1 : 0)} />;
  }

  if (data.length === 0) {
    return (
      <div className="border border-[#EFE9DF] rounded-2xl overflow-hidden bg-white shadow-2xs">
        <EmptyState title={emptyTitle || emptyMessage || 'No records found'} description={emptyDescription} />
      </div>
    );
  }

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className={cn('border border-[#EFE9DF] rounded-2xl overflow-hidden bg-white shadow-2xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF8F3] border-b border-[#EFE9DF] text-[#6B7280] text-xs font-semibold uppercase tracking-wider">
              {selectable && (
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#143D2D] focus:ring-[#143D2D] accent-[#143D2D]"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 select-none whitespace-nowrap',
                    dense ? 'py-2.5 text-[11px]' : 'py-3.5 text-xs',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortable && 'cursor-pointer hover:bg-[#F2ECE1] hover:text-[#11241C] transition-colors'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={cn('inline-flex items-center gap-1.5', col.align === 'right' && 'flex-row-reverse')}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[#9CA3AF]">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#143D2D]" /> : <ArrowDown className="w-3 h-3 text-[#143D2D]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody
            key={pagination?.currentPage !== undefined ? `page-${pagination.currentPage}` : 'static-tbody'}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="divide-y divide-[#EFE9DF] text-xs text-[#1F2937]"
          >
            {data.map((row, index) => {
              const rowId = keyExtractor(row);
              const isSelected = selectedIds.includes(rowId);

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors duration-150',
                    isSelected
                      ? 'bg-[#F2F7F4] font-medium shadow-[inset_3px_0_0_0_#143D2D]'
                      : 'bg-white hover:bg-[#FAF8F3]',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3 text-center" onClick={(e) => handleSelectRow(rowId, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#143D2D] focus:ring-[#143D2D] accent-[#143D2D] cursor-pointer"
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 whitespace-nowrap',
                        dense ? 'py-2.5 text-xs' : 'py-3.5 text-sm',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      )}
                    >
                      {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
