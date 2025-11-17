'use client';

import React from 'react';
import { Bot, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { Expression } from '@/app/lib/ai/expressions';

interface AgentExpressionProps {
  expression: Expression;
  className?: string;
}

export function AgentExpression({ expression, className = '' }: AgentExpressionProps) {
  const getStatusIcon = () => {
    if (expression.type.includes('completed')) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (expression.type.includes('error')) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    if (expression.type.includes('assigned') || expression.type.includes('processing')) {
      return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
    }
    return <Activity className="w-4 h-4 text-purple-400" />;
  };

  const getTypeLabel = () => {
    switch (expression.type) {
      case 'agent.state':
        return 'State Update';
      case 'agent.task.assigned':
        return 'Task Assigned';
      case 'agent.task.completed':
        return 'Task Completed';
      case 'agent.decision':
        return 'Decision';
      case 'consensus.requested':
        return 'Consensus Requested';
      case 'consensus.reached':
        return 'Consensus Reached';
      case 'attestation.generated':
        return 'Attestation Generated';
      default:
        return expression.type;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div
      className={`
        card-modern p-4 border border-purple-500/20
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-sm font-semibold text-white">
              {expression.agentId || 'System'}
            </div>
            <div className="text-xs text-gray-400">{getTypeLabel()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs text-gray-500">
            {formatTimestamp(expression.timestamp)}
          </span>
        </div>
      </div>

      {expression.data && Object.keys(expression.data).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <pre className="text-xs text-gray-300 overflow-x-auto">
            {JSON.stringify(expression.data, null, 2)}
          </pre>
        </div>
      )}

      {expression.metadata?.tags && expression.metadata.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {expression.metadata.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

