import React, { ReactNode } from 'react';
import { Clock, Sparkles, AlertCircle } from 'lucide-react';

type Accent = 'blue' | 'purple' | 'emerald' | 'amber';

interface ComingSoonBannerProps {
  title: string;
  description: string;
  highlights?: string[];
  checklist?: string[];
  accent?: Accent;
  children?: ReactNode;
}

const ACCENT_STYLES: Record<Accent, { border: string; glow: string; badge: string }> = {
  blue: {
    border: 'border-blue-500/40',
    glow: 'from-blue-500/15 via-indigo-500/5 to-transparent',
    badge: 'bg-blue-500/20 text-blue-200',
  },
  purple: {
    border: 'border-purple-500/40',
    glow: 'from-purple-500/15 via-pink-500/5 to-transparent',
    badge: 'bg-purple-500/20 text-purple-200',
  },
  emerald: {
    border: 'border-emerald-500/40',
    glow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    badge: 'bg-emerald-500/20 text-emerald-200',
  },
  amber: {
    border: 'border-amber-500/50',
    glow: 'from-amber-500/20 via-orange-500/5 to-transparent',
    badge: 'bg-amber-500/20 text-amber-200',
  },
};

export function ComingSoonBanner({
  title,
  description,
  highlights,
  checklist,
  accent = 'purple',
  children,
}: ComingSoonBannerProps) {
  const accentStyles = ACCENT_STYLES[accent];

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gray-900/80 backdrop-blur-md p-8 shadow-2xl text-white">
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${accentStyles.glow} opacity-80`}
      />
      <div className="relative z-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className={`px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase ${accentStyles.badge} border border-white/5 flex items-center gap-2`}>
            <Clock size={14} />
            Coming Soon
          </div>
          <Sparkles className="text-yellow-200 animate-pulse" size={18} />
        </div>

        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-gray-300 mt-3 max-w-3xl">{description}</p>
        </div>

        {highlights && highlights.length > 0 && (
          <div className={`rounded-2xl border ${accentStyles.border} bg-black/30 p-5`}>
            <p className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-300" />
              Sneak Peek
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {highlights.map((highlight, index) => (
                <div key={`highlight-${index}`} className="text-sm text-gray-300 bg-white/5 rounded-xl p-3 border border-white/5">
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        )}

        {checklist && checklist.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-gray-950/60 p-5">
            <p className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-300" />
              Here's what we're finalizing
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              {checklist.map((item, index) => (
                <li key={`todo-${index}`} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

