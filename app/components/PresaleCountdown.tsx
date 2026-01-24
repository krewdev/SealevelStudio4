'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, X, Move, Zap, ShoppingCart, ArrowRight } from 'lucide-react';

export function PresaleCountdown() {
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 200 : 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
          </div>
          <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold animate-pulse">
            LIVE
          </span>
        </div>

        <button
          onClick={handlePresaleClick}
          className="mt-4 w-full flex items-center justify-center gap-2 text-emerald-300 text-sm bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-700/50 hover:border-emerald-600/70 rounded-lg p-3 transition-all group"
        >
          <CheckCircle2 size={16} />
          <span className="font-medium">Presale is active. Click to participate!</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

