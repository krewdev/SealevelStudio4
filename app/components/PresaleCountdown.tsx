'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, X, Move, Zap, ShoppingCart, ArrowRight, Clock } from 'lucide-react';
import { DEFAULT_PRESALE_CONFIG } from '../lib/seal-token/presale';

export function PresaleCountdown() {
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 200 : 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isStarted, setIsStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get presale start time from env var or default config
  const getPresaleStartTime = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Try NEXT_PUBLIC_PRESALE_TIMESTAMP (timestamp in milliseconds)
      if (process.env.NEXT_PUBLIC_PRESALE_TIMESTAMP) {
        const timestamp = parseInt(process.env.NEXT_PUBLIC_PRESALE_TIMESTAMP, 10);
        if (!isNaN(timestamp) && timestamp > 0) {
          const date = new Date(timestamp);
          // Validate the date is in the future (or allow past dates if explicitly set)
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      // Try NEXT_PUBLIC_PRESALE_DATE (ISO 8601 date string)
      if (process.env.NEXT_PUBLIC_PRESALE_DATE) {
        const date = new Date(process.env.NEXT_PUBLIC_PRESALE_DATE);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    // Default: return a future date (2 weeks from now) to ensure countdown shows
    // This prevents the presale from appearing "live" when no config is set
    return DEFAULT_PRESALE_CONFIG.startTime;
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const startTime = getPresaleStartTime().getTime();
      
      const distance = startTime - now;
      const hasStarted = now >= startTime;
      setIsStarted(hasStarted);

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsStarted(true);
      }
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getPresaleStartTime]);

  const handlePresaleClick = useCallback(() => {
    // Navigate to presale page - dispatch custom event that page component listens to
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('navigateToPresale', { bubbles: true });
      window.dispatchEvent(event);
    }
  }, []);

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
          <div className="flex-1">
            {isStarted ? (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-2 mb-2">
                  <ShoppingCart size={14} />
                  Presale On Sale Now
                </p>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-400" />
                  SEAL Token Presale is Live!
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  Join the presale and get bonus tokens. Limited time offer.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-300 flex items-center gap-2 mb-2">
                  <Clock size={14} />
                  Presale Starting Soon
                </p>
                <p className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-400" />
                  SEAL Token Presale
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Starts in:</span>
                  <div className="flex items-center gap-1.5">
                    {timeLeft.days > 0 && (
                      <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-700/50 text-blue-200 font-mono text-xs">
                        {timeLeft.days}d
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-700/50 text-blue-200 font-mono text-xs">
                      {String(timeLeft.hours).padStart(2, '0')}h
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-700/50 text-blue-200 font-mono text-xs">
                      {String(timeLeft.minutes).padStart(2, '0')}m
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-700/50 text-blue-200 font-mono text-xs">
                      {String(timeLeft.seconds).padStart(2, '0')}s
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          {isStarted && (
            <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold animate-pulse">
              LIVE
            </span>
          )}
        </div>

        <button
          onClick={handlePresaleClick}
          className={`mt-4 w-full flex items-center justify-center gap-2 text-sm rounded-lg p-3 transition-all group ${
            isStarted
              ? 'text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-700/50 hover:border-emerald-600/70'
              : 'text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-700/50 hover:border-blue-600/70 cursor-pointer'
          }`}
        >
          {isStarted ? (
            <>
              <CheckCircle2 size={16} />
              <span className="font-medium">Presale is active. Click to participate!</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          ) : (
            <>
              <Clock size={16} />
              <span className="font-medium">View presale details</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

