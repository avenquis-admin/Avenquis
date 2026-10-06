/**
 * FormField & Select - Enterprise dense form primitives
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: string;
  id?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  required,
  hint,
  error,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-wider uppercase text-[#4A5952]"
        >
          {label}
          {required && <span className="text-[#A82824] ml-1">*</span>}
        </label>
        {hint && <span className="text-[11px] text-[#7A8A82]">{hint}</span>}
      </div>

      {children}

      {error && (
        <p className="text-xs text-[#A82824] flex items-center gap-1 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  hasError?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  hasError,
  className,
  ...props
}) => {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border rounded-xl text-[#11241C] focus:outline-none transition-colors appearance-none cursor-pointer',
          hasError
            ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
            : 'border-[#E4DFD5] focus:border-[#143D2D] focus:ring-1 focus:ring-[#143D2D]',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9CA3AF]">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
};

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF]">
      <div className="space-y-1 min-w-0">
        <label className="text-xs font-semibold text-[#11241C] block cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#6B7280] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#143D2D]',
          checked ? 'bg-[#143D2D]' : 'bg-[#D1D5DB]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  hasError?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  description,
  hasError,
  className,
  id,
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#11241C] block">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          'w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border rounded-xl text-[#11241C] placeholder-[#9CA3AF] focus:outline-none transition-colors shadow-2xs',
          hasError
            ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
            : 'border-[#E4DFD5] focus:border-[#143D2D] focus:ring-1 focus:ring-[#143D2D]',
          props.disabled && 'opacity-60 cursor-not-allowed bg-[#F3EFE6]',
          className
        )}
        {...props}
      />
      {description && (
        <p className="text-xs text-[#6B7280]">{description}</p>
      )}
    </div>
  );
};
