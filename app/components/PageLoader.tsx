'use client';

import React, { useEffect, useState } from 'react';
import { SealAnimation } from './SealAnimation';

interface LoadingContext {
  featureName: string;
  description: string;
  directions?: string[];
  cost?: string;
  disclaimer?: string;
  extraNote?: string;
}

interface PageLoaderProps {
  isLoading: boolean;
  duration?: number; // Duration in milliseconds (default 3000ms = 3 seconds)
  onAnimationComplete?: () => void; // Callback when animation finishes
  quote?: {
    text: string;
    author: string;
  }; // Custom quote for loading screen
  context?: LoadingContext;
}

export function PageLoader({ isLoading, duration = 3000, onAnimationComplete, quote, context }: PageLoaderProps) {
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

      {context && (
        <div className="w-full max-w-xl mt-8 bg-gray-950/70 border border-gray-800 rounded-2xl p-5 text-left space-y-4 shadow-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-300 flex items-center gap-2">
              Preparing
              <span className="text-white/80 tracking-normal">{context.featureName}</span>
            </p>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">{context.description}</p>
          </div>

          {context.directions && context.directions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Quick Directions
              </p>
              <ul className="space-y-1 text-sm text-gray-200 list-disc list-inside">
                {context.directions.map((step, index) => (
                  <li key={`direction-${index}`}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {context.cost && (
            <div className="text-sm text-blue-200">
              <span className="font-semibold text-blue-300">Estimated Cost:</span> {context.cost}
            </div>
          )}

          {context.disclaimer && (
            <div className="text-xs text-gray-400 border-t border-gray-800 pt-2">
              {context.disclaimer}
            </div>
          )}

          {context.extraNote && (
            <p className="text-xs text-gray-400 italic">{context.extraNote}</p>
          )}
        </div>
      )}

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

