'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Wallet,
  Coins,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
} from 'lucide-react';

interface TransactionStep {
  id: string;
  type: 'account' | 'instruction' | 'program' | 'result';
  label: string;
  status: 'pending' | 'success' | 'failed';
  details?: {
    address?: string;
    balance?: number;
    data?: any;
    computeUnits?: number;
    fee?: number;
  };
}

interface TransactionFlowDiagramProps {
  steps: TransactionStep[];
  direction?: 'horizontal' | 'vertical';
  showDetails?: boolean;
}

export function TransactionFlowDiagram({
  steps,
  direction = 'horizontal',
  showDetails = true,
}: TransactionFlowDiagramProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  const getStepIcon = (step: TransactionStep) => {
    switch (step.type) {
      case 'account':
        return <Wallet className="w-5 h-5" />;
      case 'instruction':
        return <Zap className="w-5 h-5" />;
      case 'program':
        return <Coins className="w-5 h-5" />;
      case 'result':
        return step.status === 'success' ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <XCircle className="w-5 h-5" />
        );
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStepColor = (step: TransactionStep) => {
    switch (step.status) {
      case 'success':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'failed':
        return 'bg-red-500/20 border-red-500 text-red-400';
      default:
        return 'bg-blue-500/20 border-blue-500 text-blue-400';
    }
  };

  if (direction === 'vertical') {
    return (
      <div className="card-modern p-6">
        <h3 className="text-lg font-bold mb-6">Transaction Flow</h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                  selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
                } ${getStepColor(step)}`}
                onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{step.label}</p>
                  {step.details && showDetails && (
                    <div className="text-xs mt-1 opacity-75">
                      {step.details.address && (
                        <p className="truncate">{step.details.address.slice(0, 20)}...</p>
                      )}
                      {step.details.computeUnits && (
                        <p>CU: {step.details.computeUnits.toLocaleString()}</p>
                      )}
                      {step.details.fee && (
                        <p>Fee: {step.details.fee} SOL</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {step.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {step.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  {step.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern p-6 overflow-x-auto">
      <h3 className="text-lg font-bold mb-6">Transaction Flow</h3>
      <div className="flex items-center gap-4 min-w-max">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 min-w-[150px] ${
                selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
              } ${getStepColor(step)}`}
              onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              <p className="font-medium text-sm text-center">{step.label}</p>
              {step.details && showDetails && (
                <div className="text-xs text-center opacity-75">
                  {step.details.computeUnits && (
                    <p>CU: {step.details.computeUnits.toLocaleString()}</p>
                  )}
                  {step.details.fee && (
                    <p className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {step.details.fee}
                    </p>
                  )}
                </div>
              )}
              <div className="flex-shrink-0">
                {step.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {step.status === 'failed' && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                {step.status === 'pending' && (
                  <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-6 h-6 text-gray-500 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Selected Step Details */}
      {selectedStep && showDetails && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          {(() => {
            const step = steps.find(s => s.id === selectedStep);
            if (!step || !step.details) return null;
            return (
              <div className="space-y-2">
                <h4 className="font-bold text-white">{step.label} Details</h4>
                {step.details.address && (
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-white font-mono">{step.details.address}</p>
                  </div>
                )}
                {step.details.balance !== undefined && (
                  <div>
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className="text-sm text-white">{step.details.balance} SOL</p>
                  </div>
                )}
                {step.details.computeUnits && (
                  <div>
                    <p className="text-xs text-gray-400">Compute Units</p>
                    <p className="text-sm text-white">{step.details.computeUnits.toLocaleString()}</p>
                  </div>
                )}
                {step.details.fee && (
                  <div>
                    <p className="text-xs text-gray-400">Fee</p>
                    <p className="text-sm text-white">{step.details.fee} SOL</p>
                  </div>
                )}
                {step.details.data && (
                  <div>
                    <p className="text-xs text-gray-400">Data</p>
                    <pre className="text-xs text-white bg-gray-900 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(step.details.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

