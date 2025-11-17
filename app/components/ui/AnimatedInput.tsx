'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showAI?: boolean;
  particles?: boolean;
}

export function AnimatedInput({
  label,
  showAI = false,
  particles = true,
  className = '',
  ...props
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      setHasValue(!!inputRef.current.value);
    }
  }, [props.value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
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
              input-floating-label
              absolute left-4 transition-all duration-300 pointer-events-none
              ${isFocused || hasValue
                ? 'top-2 text-xs text-purple-400'
                : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
              }
            `}
          >
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={`
            w-full px-4 py-3 text-white placeholder-gray-500
            bg-transparent border-none outline-none
            ${label && (isFocused || hasValue) ? 'pt-6' : ''}
            ${className}
          `}
          placeholder={label && !isFocused ? '' : props.placeholder}
        />
        {showAI && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

