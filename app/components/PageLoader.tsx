'use client';

import React, { useEffect, useState } from 'react';
import { SealAnimation } from './SealAnimation';

interface PageLoaderProps {
  isLoading: boolean;
  duration?: number; // Duration in milliseconds (default 3000ms = 3 seconds)
  onAnimationComplete?: () => void; // Callback when animation finishes
  quote?: {
    text: string;
    author: string;
  }; // Custom quote for loading screen
}

export function PageLoader({ isLoading, duration = 3000, onAnimationComplete, quote }: PageLoaderProps) {
  const [showLoader, setShowLoader] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setProgress(0);

      // Animate progress bar
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= duration) {
          clearInterval(interval);
          // Fade out after completion
          setTimeout(() => {
            setShowLoader(false);
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }, 300);
        }
      }, 16); // ~60fps updates

      return () => {
        clearInterval(interval);
      };
    } else {
      setShowLoader(false);
    }
  }, [isLoading, duration, onAnimationComplete]);

  if (!showLoader) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
      style={{
        opacity: showLoader ? 1 : 0,
      }}
    >
      {/* Sea Lion Animation */}
      <div className="mb-8">
        <SealAnimation size={200} />
      </div>

      {/* Loading Text */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          "{quote?.text || "The future of money is programmable."}"
        </h2>
        <p className="text-gray-400 text-sm italic">
          - {quote?.author || "Vitalik Buterin"}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-80 max-w-[90vw] h-2 bg-gray-800 rounded-full overflow-hidden shadow-lg">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full transition-all duration-100 ease-out relative"
          style={{
            width: `${progress}%`,
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
      </div>

      {/* Progress Percentage */}
      <p className="text-gray-400 text-sm mt-4">
        {Math.round(progress)}%
      </p>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

