/**
 * FilterBar & Tabs - Interactive filtering and tabbed controls
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { SearchField } from './SearchField';
import { Filter, RotateCcw } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  statusOptions?: FilterOption[];
  onStatusChange?: (val: string) => void;
  secondaryFilter?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (val: string) => void;
  };
  onReset?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  statusOptions,
  onStatusChange,
  secondaryFilter,
  onReset,
  actions,
  className,
}) => {
  const hasActiveFilters = Boolean(
    searchValue ||
      (statusFilter && statusFilter !== 'all') ||
      (secondaryFilter && secondaryFilter.value && secondaryFilter.value !== 'all')
  );

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-white border border-[#EFE9DF] rounded-2xl shadow-2xs',
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-[200px]"
        />

        {statusOptions && onStatusChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <select
              value={statusFilter || 'all'}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E4DFD5] rounded-xl text-[#1F2937] focus:outline-none focus:border-[#143D2D]"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {secondaryFilter && (
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={secondaryFilter.value || 'all'}
              onChange={(e) => secondaryFilter.onChange(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E4DFD5] rounded-xl text-[#1F2937] focus:outline-none focus:border-[#143D2D]"
              aria-label={secondaryFilter.label}
            >
              <option value="all">All {secondaryFilter.label}</option>
              {secondaryFilter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FDF2F2] rounded-xl border border-[#F5D3D3] transition-colors shrink-0 font-medium"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 justify-end shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#EFE9DF]">
          {actions}
        </div>
      )}
    </div>
  );
};

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  if (variant === 'pills') {
    return (
      <div className={cn('flex items-center gap-1.5 p-1.5 bg-[#FAF8F3] rounded-2xl border border-[#EFE9DF] overflow-x-auto', className)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all',
                isActive
                  ? 'bg-[#143D2D] text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#11241C] hover:bg-[#F2ECE1]'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold',
                    isActive ? 'bg-[#0E2A1F] text-[#E5D29E]' : 'bg-[#E5DFD3] text-[#4B5563]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('border-b border-[#EFE9DF] flex items-center gap-6 overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'pb-3 pt-1 text-xs font-medium whitespace-nowrap transition-colors relative flex items-center gap-2',
              isActive
                ? 'text-[#143D2D] font-semibold'
                : 'text-[#6B7280] hover:text-[#11241C]'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-mono',
                  isActive
                    ? 'bg-[#143D2D] text-white'
                    : 'bg-[#F3EFE6] text-[#6B7280]'
                )}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#143D2D] rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
};
