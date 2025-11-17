'use client';

import React from 'react';
import { Sparkles, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ExpressionIndicatorProps {
  type: 'agent' | 'consensus' | 'attestation';
  status: 'idle' | 'active' | 'processing' | 'completed' | 'error';
  count?: number;
  className?: string;
}

export function ExpressionIndicator({
  type,
  status,
  count,
  className = '',
}: ExpressionIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'processing':
        return 'text-yellow-400';
      default:
        return 'text-purple-400';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getIcon()}
      <span className={`text-sm font-medium ${getColor()}`}>
        {type === 'agent' && 'Agent'}
        {type === 'consensus' && 'Consensus'}
        {type === 'attestation' && 'Attestation'}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}

