'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface AnimatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  showAI?: boolean;
  particles?: boolean;
}

export function AnimatedTextarea({
  label,
  showAI = false,
  particles = true,
  className = '',
  ...props
}: AnimatedTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      setHasValue(!!textareaRef.current.value);
    }
  }, [props.value]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
          flex items-start relative min-h-[120px]
        `}
      >
        {label && (
          <label
            className={`
              absolute left-4 transition-all duration-300 pointer-events-none
              ${isFocused || hasValue
                ? 'top-2 text-xs text-purple-400'
                : 'top-4 text-sm text-gray-400'
              }
            `}
          >
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={`
            w-full px-4 py-3 text-white placeholder-gray-500
            bg-transparent border-none outline-none resize-none
            ${label && (isFocused || hasValue) ? 'pt-6' : ''}
            ${className}
          `}
          placeholder={label && !isFocused ? '' : props.placeholder}
        />
        {showAI && (
          <div className="absolute right-4 top-4">
            <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

