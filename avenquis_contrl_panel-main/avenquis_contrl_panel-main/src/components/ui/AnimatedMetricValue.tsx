/**
 * Avenquis Control Panel - Animated Metric Value Primitive
 * Smoothly interpolates numeric values from 0 to target on initial mount only.
 * Respects prefers-reduced-motion, maintains prefixes/suffixes/commas.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface AnimatedMetricValueProps {
  value: string | number;
  className?: string;
  durationMs?: number;
}

interface ParsedMetric {
  isNumeric: boolean;
  prefix: string;
  target: number;
  suffix: string;
  decimals: number;
  hasCommas: boolean;
}

function parseMetricValue(raw: string | number): ParsedMetric {
  if (typeof raw === 'number') {
    return {
      isNumeric: true,
      prefix: '',
      target: raw,
      suffix: '',
      decimals: raw % 1 !== 0 ? 2 : 0,
      hasCommas: raw >= 1000,
    };
  }

  const str = String(raw).trim();

  // Pattern: optional prefix (e.g. $, £, €, +), number with optional commas/decimals, optional suffix (e.g. %, ms, k, /month)
  const regex = /^([^\d\-+.]*?)([+-]?[\d,]+(?:\.\d+)?)([^\d]*)$/;
  const match = str.match(regex);

  if (!match) {
    return {
      isNumeric: false,
      prefix: '',
      target: 0,
      suffix: '',
      decimals: 0,
      hasCommas: false,
    };
  }

  const prefix = match[1] || '';
  const numStr = match[2] || '';
  const suffix = match[3] || '';

  const cleanNum = numStr.replace(/,/g, '');
  const num = parseFloat(cleanNum);

  if (isNaN(num)) {
    return {
      isNumeric: false,
      prefix: '',
      target: 0,
      suffix: '',
      decimals: 0,
      hasCommas: false,
    };
  }

  const hasCommas = numStr.includes(',');
  const decimalPart = cleanNum.split('.')[1];
  const decimals = decimalPart ? decimalPart.length : 0;

  return {
    isNumeric: true,
    prefix,
    target: num,
    suffix,
    decimals,
    hasCommas,
  };
}

function formatAnimatedNumber(current: number, parsed: ParsedMetric): string {
  let formatted = current.toFixed(parsed.decimals);
  if (parsed.hasCommas) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }
  return `${parsed.prefix}${formatted}${parsed.suffix}`;
}

export const AnimatedMetricValue: React.FC<AnimatedMetricValueProps> = ({
  value,
  className,
  durationMs = 750,
}) => {
  const shouldReduce = useReducedMotion();
  const parsed = parseMetricValue(value);

  // If non-numeric or reduced-motion is requested, output immediately
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (shouldReduce || !parsed.isNumeric) {
      return String(value);
    }
    return formatAnimatedNumber(0, parsed);
  });

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (shouldReduce || !parsed.isNumeric || hasAnimatedRef.current) {
      setDisplayValue(String(value));
      return;
    }

    hasAnimatedRef.current = true;
    const startVal = 0;
    const endVal = parsed.target;
    const startTime = performance.now();

    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Smooth ease-out cubic curve (zero bounce, natural deceleration)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      setDisplayValue(formatAnimatedNumber(current, parsed));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(String(value));
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs, shouldReduce]);

  return <span className={className}>{displayValue}</span>;
};
