'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ConsensusBadgeProps {
  consensus: boolean;
  confidence: number;
  agreement: number;
  className?: string;
}

export function ConsensusBadge({
  consensus,
  confidence,
  agreement,
  className = '',
}: ConsensusBadgeProps) {
  const getIcon = () => {
    if (consensus) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (confidence > 0.5) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getColor = () => {
    if (consensus) {
      return 'bg-green-500/20 border-green-500/30 text-green-400';
    }
    if (confidence > 0.5) {
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
    }
    return 'bg-red-500/20 border-red-500/30 text-red-400';
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1 rounded-full
        border ${getColor()}
        ${className}
      `}
    >
      {getIcon()}
      <span className="text-xs font-medium">
        {consensus ? 'Consensus' : 'No Consensus'}
      </span>
      <span className="text-xs opacity-75">
        {Math.round(confidence * 100)}% / {Math.round(agreement)}%
      </span>
    </div>
  );
}

