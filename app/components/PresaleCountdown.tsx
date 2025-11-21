'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AlarmClock, BellRing, CheckCircle2, Calendar, X, Move } from 'lucide-react';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}

const formatDateForICS = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';

const calculateTimeLeft = (target: Date): TimeLeft => {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, completed: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    completed: false,
  };
};

const resolveTargetDate = () => {
  if (typeof window === 'undefined') {
    // use a deterministic baseline during SSR; client will correct immediately
    return new Date(Date.now() + TWO_WEEKS_MS);
  }

  const envValue =
    process.env.NEXT_PUBLIC_PRESALE_TIMESTAMP ||
    process.env.NEXT_PUBLIC_PRESALE_DATE;
  if (envValue) {
    const parsed = new Date(envValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(Date.now() + TWO_WEEKS_MS);
};

export function PresaleCountdown() {
  const targetDate = useMemo(() => resolveTargetDate(), []);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [reminderSet, setReminderSet] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 200 : 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('sealevel-presale-reminder');
    setReminderSet(stored === 'true');
  }, []);

  const handleReminder = useCallback(() => {
    setReminderSet(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sealevel-presale-reminder', 'true');
    }
  }, []);

  const handleDownloadICS = useCallback(() => {
    if (typeof window === 'undefined') return;
    const start = formatDateForICS(targetDate);
    const end = formatDateForICS(new Date(targetDate.getTime() + 60 * 60 * 1000));
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'SUMMARY:Sealevel Studio Presale',
      'DESCRIPTION:Presale access for the Sealevel Studio ecosystem goes live.',
      'LOCATION:sealevel.studio',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sealevel-presale.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [targetDate]);

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const maxX = window.innerWidth - 320; // Account for component width
    const maxY = window.innerHeight - 200; // Account for component height

    setPosition({
      x: Math.max(0, Math.min(e.clientX - dragOffset.x, maxX)),
      y: Math.max(0, Math.min(e.clientY - dragOffset.y, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const formattedDate = targetDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-[10050] pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div className="w-[calc(100vw-1.5rem)] sm:w-80 pointer-events-auto rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur-lg shadow-2xl shadow-blue-900/30 p-4 text-gray-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div
            className="flex items-center gap-2 cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <Move size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">Drag</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="Close countdown"
          >
            <X size={14} className="text-gray-400 hover:text-gray-200" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300 flex items-center gap-2">
              <AlarmClock size={14} />
              Presale Countdown
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Target launch: {formattedDate}
            </p>
          </div>
          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200">
            T-14d
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
            <div key={unit} className="bg-white/5 rounded-xl py-2 border border-white/5">
              <p className="text-xl font-semibold">
                {String(timeLeft[unit]).padStart(2, '0')}
              </p>
              <p className="text-[0.6rem] uppercase tracking-wide text-gray-400">
                {unit}
              </p>
            </div>
          ))}
        </div>

        {timeLeft.completed ? (
          <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 size={16} />
            Presale portal is live. Refresh to access minting.
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              <button
                onClick={handleReminder}
                disabled={reminderSet}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 px-3 py-2 text-sm font-medium transition ${
                  reminderSet
                    ? 'bg-blue-900/30 text-blue-200 cursor-default'
                    : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-100'
                }`}
              >
                <BellRing size={16} />
                {reminderSet ? 'Reminder Saved' : 'Remind Me In-App'}
              </button>
              <button
                onClick={handleDownloadICS}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 transition"
              >
                <Calendar size={16} />
                Add to Calendar
              </button>
            </div>
            <p className="text-[0.65rem] text-gray-500 mt-3 leading-relaxed">
              Participation is optional and subject to local regulations. This reminder is stored only on this device.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

