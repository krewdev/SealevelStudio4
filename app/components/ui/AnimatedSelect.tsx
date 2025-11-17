'use client';

import React, { useState, useRef } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

interface AnimatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  showAI?: boolean;
  particles?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function AnimatedSelect({
  label,
  showAI = false,
  particles = true,
  options,
  className = '',
  ...props
}: AnimatedSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  return (
    <div className="relative">
      <div
        className={`
          input-glass input-holographic input-shimmer
          ${particles ? 'input-particles' : ''}
          ${showAI ? 'input-ai-active' : ''}
          flex items-center relative
        `}
      >
        {label && (
          <label
            className={`
              absolute left-4 transition-all duration-300 pointer-events-none z-10
              ${isFocused || props.value
                ? 'top-2 text-xs text-purple-400'
                : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
              }
            `}
          >
            {label}
          </label>
        )}
        <select
          ref={selectRef}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={() => setIsOpen(true)}
          onMouseUp={() => setIsOpen(false)}
          className={`
            w-full px-4 py-3 text-white
            bg-transparent border-none outline-none appearance-none
            cursor-pointer
            ${label && (isFocused || props.value) ? 'pt-6' : ''}
            ${className}
          `}
        >
          {!props.value && (
            <option value="" disabled>
              {label || 'Select an option...'}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
          {showAI && (
            <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}

