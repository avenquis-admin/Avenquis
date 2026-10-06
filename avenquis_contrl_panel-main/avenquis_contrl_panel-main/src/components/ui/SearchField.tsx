/**
 * SearchField - High precision search input with keyboard shortcut and clear button
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'Search records by name, ID or metadata...',
  shortcut = '/',
  className,
}) => {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="absolute left-3 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-14 py-2 text-xs bg-white border border-[#E4DFD5] rounded-xl text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#143D2D] focus:ring-1 focus:ring-[#143D2D] transition-colors shadow-2xs"
      />
      <div className="absolute right-2.5 flex items-center gap-1">
        {value ? (
          <button
            onClick={() => onChange('')}
            className="p-1 text-[#9CA3AF] hover:text-[#11241C] rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          shortcut && (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#6B7280] bg-[#F3EFE6] border border-[#E2DAD0] rounded-md">
              {shortcut}
            </kbd>
          )
        )}
      </div>
    </div>
  );
};
