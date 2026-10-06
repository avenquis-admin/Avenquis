/**
 * Avenquis Control Panel - Error State Component
 */

import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorStateProps {
  title: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  errorCode = 'ERR_PLATFORM_GATEWAY_ANOMALY',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-8 bg-[#FAF8F3] border border-[#F0C2C0] rounded-xl text-center flex flex-col items-center justify-center space-y-4 shadow-xs',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#FCE8E7] text-[#C5302C] flex items-center justify-center">
        <AlertOctagon className="w-6 h-6" />
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-base font-serif font-semibold text-[#11241C]">{title}</h3>
        <p className="text-xs text-[#63736B] leading-relaxed">{message}</p>
        <p className="font-mono text-[10px] text-[#8A1F1D] pt-1">Code: {errorCode}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium transition-colors shadow-xs"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Retry Platform Gateway Call</span>
        </button>
      )}
    </div>
  );
};
