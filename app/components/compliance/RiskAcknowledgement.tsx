'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ShieldAlert, BadgeAlert, CheckCircle2, Info } from 'lucide-react';

type Accent = 'blue' | 'purple' | 'teal' | 'orange' | 'red';
type Layout = 'full' | 'inline';

interface RiskAcknowledgementProps {
  featureName: string;
  summary: string;
  bulletPoints?: string[];
  costDetails?: string[];
  disclaimers?: string[];
  checkItems?: string[];
  ctaLabel?: string;
  accent?: Accent;
  layout?: Layout;
  cardClassName?: string;
  onAccept: () => void;
}

const ACCENT_MAP: Record<Accent, string> = {
  blue: 'from-blue-500/25 via-cyan-500/10 to-blue-800/10',
  purple: 'from-purple-500/25 via-pink-500/10 to-indigo-800/10',
  teal: 'from-teal-500/25 via-emerald-500/10 to-slate-800/10',
  orange: 'from-amber-500/25 via-orange-500/10 to-brown-800/10',
  red: 'from-rose-500/25 via-red-500/10 to-slate-900/10',
};

export function RiskAcknowledgement({
  featureName,
  summary,
  bulletPoints,
  costDetails,
  disclaimers,
  checkItems,
  ctaLabel = 'Acknowledge & Continue',
  accent = 'blue',
  layout = 'full',
  cardClassName = '',
  onAccept,
}: RiskAcknowledgementProps) {
  const requiredChecks = useMemo(() => {
    const defaults = [
      `I understand ${featureName} can trigger irreversible actions on live networks.`,
      'I will follow all applicable local laws, platform terms, and regulatory guidance.',
      'I release Sealevel Studio contributors from liability for any misuse or loss.',
    ];
    return (checkItems && checkItems.length > 0 ? checkItems : defaults).map((label, index) => ({
      id: `risk-check-${index}`,
      label,
    }));
  }, [featureName, checkItems]);

  const [agreements, setAgreements] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAgreements((prev) => {
      const next: Record<string, boolean> = {};
      requiredChecks.forEach(({ id }) => {
        next[id] = prev[id] ?? false;
      });
      return next;
    });
  }, [requiredChecks]);

  const allChecked = requiredChecks.every(({ id }) => agreements[id]);

  const card = (
    <div className={`relative w-full bg-gray-900/95 border border-yellow-600/40 rounded-2xl shadow-2xl overflow-hidden ${cardClassName}`}>
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${ACCENT_MAP[accent]} opacity-60`}
      />
      <div className="relative z-10 p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <ShieldAlert className="text-yellow-300" size={28} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-yellow-300/90 font-semibold">
              Mandatory Risk Clearance
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {featureName}
            </h2>
            <p className="text-gray-300 text-sm md:text-base mt-3 leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        {bulletPoints && bulletPoints.length > 0 && (
          <div className="bg-gray-900/70 border border-gray-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <BadgeAlert size={16} className="text-gray-400" />
              What this tool can do
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
              {bulletPoints.map((point, index) => (
                <li key={`bullet-${index}`}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {costDetails && costDetails.length > 0 && (
          <div className="bg-gray-900/70 border border-gray-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Info size={16} className="text-blue-400" />
              Cost & Usage Notes
            </p>
            <ul className="space-y-1 text-sm text-gray-300">
              {costDetails.map((detail, index) => (
                <li key={`cost-${index}`}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-950/70 border border-yellow-800/40 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-yellow-200">Confirm all statements:</p>
          {requiredChecks.map(({ id, label }) => (
            <label key={id} className="flex items-start gap-3 cursor-pointer text-sm text-gray-200">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-500"
                checked={agreements[id] || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAgreements((prev) => ({ ...prev, [id]: checked }));
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {disclaimers && disclaimers.length > 0 && (
          <div className="space-y-2 text-xs text-gray-400">
            {disclaimers.map((item, index) => (
              <p key={`disclaimer-${index}`}>• {item}</p>
            ))}
          </div>
        )}

        <button
          onClick={onAccept}
          disabled={!allChecked}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-gray-900 font-semibold py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
        >
          <CheckCircle2 className="w-5 h-5" />
          {ctaLabel}
        </button>
      </div>
    </div>
  );

  if (layout === 'inline') {
    return card;
  }

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="w-full max-w-4xl">{card}</div>
    </div>
  );
}

