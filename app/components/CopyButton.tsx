'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: number;
  showText?: boolean;
}

export function CopyButton({ text, className = '', size = 16, showText = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={size} className="text-green-400" />
          {showText && <span className="text-xs text-green-400">Copied!</span>}
        </>
      ) : (
        <>
          <Copy size={size} className="text-gray-400 hover:text-white" />
          {showText && <span className="text-xs text-gray-400">Copy</span>}
        </>
      )}
    </button>
  );
}

