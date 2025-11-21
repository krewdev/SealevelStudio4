'use client';

import React, { useState } from 'react';
import { X, Info } from 'lucide-react';
import { InstructionTemplate } from '../lib/instructions/types';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface TemplateSelectorModalProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  templates: InstructionTemplate[];
  onSelectTemplate: (template: InstructionTemplate) => void;
  onClose: () => void;
}

interface TemplateTooltipProps {
  template: InstructionTemplate;
  children: React.ReactElement;
}

function TemplateTooltip({ template, children }: TemplateTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getRules = () => {
    const rules: string[] = [];

    template.args.forEach(arg => {
      if (arg.validation) {
        if (arg.validation.min !== undefined) {
          rules.push(`${arg.name}: minimum ${arg.validation.min}`);
        }
        if (arg.validation.max !== undefined) {
          rules.push(`${arg.name}: maximum ${arg.validation.max}`);
        }
        if (arg.validation.pattern) {
          rules.push(`${arg.name}: must match pattern`);
        }
      }
      if (arg.isOptional) {
        rules.push(`${arg.name}: optional`);
      }
    });

    template.accounts.forEach(acc => {
      if (acc.isOptional) {
        rules.push(`${acc.name}: optional account`);
      }
      if (acc.type === 'signer') {
        rules.push(`${acc.name}: must be a signer`);
      }
    });

    return rules;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className="absolute z-50 w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl pointer-events-none"
          style={{
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          {/* Context/Description */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-purple-400" />
              <h4 className="text-sm font-semibold text-white">{template.name}</h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{template.description}</p>
          </div>

          {/* Parameters Needed */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Parameters</h5>
            <div className="space-y-1.5">
              {template.args.length > 0 ? (
                template.args.map((arg, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-purple-400 font-mono">{arg.name}</span>
                    <span className="text-gray-500 mx-1">({arg.type})</span>
                    <span className="text-gray-400">: {arg.description}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No parameters required</div>
              )}
            </div>
          </div>

          {/* Accounts Needed */}
          {template.accounts.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Accounts</h5>
              <div className="space-y-1.5">
                {template.accounts.map((acc, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-blue-400 font-mono">{acc.name}</span>
                    <span className={`mx-1 text-xs ${
                      acc.type === 'signer' ? 'text-yellow-400' :
                      acc.type === 'writable' ? 'text-green-400' :
                      'text-gray-500'
                    }`}>
                      ({acc.type})
                    </span>
                    <span className="text-gray-400">: {acc.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {getRules().length > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Rules</h5>
              <div className="space-y-1">
                {getRules().map((rule, idx) => (
                  <div key={idx} className="text-xs text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arrow */}
          <div
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
            style={{
              borderRight: '6px solid rgb(31 41 55)',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent'
            }}
          />
        </div>
      )}
    </div>
  );
}

export function TemplateSelectorModal({
  categories,
  selectedCategory,
  onCategoryChange,
  templates,
  onSelectTemplate,
  onClose
}: TemplateSelectorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add Instruction</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {templates.map(template => (
              <TemplateTooltip key={template.id} template={template}>
                <button
                  onClick={() => onSelectTemplate(template)}
                  className="p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-purple-500/50 rounded-lg text-left transition-colors group w-full"
                >
                  <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{template.accounts.length} accounts</span>
                    <span>{template.args.length} args</span>
                  </div>
                </button>
              </TemplateTooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
