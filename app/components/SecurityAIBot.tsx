'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface SecurityAIBotProps {
  isScanning: boolean;
  progress: number; // 0-100
  currentStatus: string;
  onComplete?: (report: any) => void;
}

export function SecurityAIBot({ isScanning, progress, currentStatus, onComplete }: SecurityAIBotProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [pathIndex, setPathIndex] = useState(0);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate path around screen edge
  const calculatePath = (): Array<{ x: number; y: number }> => {
    if (typeof window === 'undefined') return [];
    
    const padding = 20;
    const botSize = 40;
    
    return [
      { x: padding, y: padding }, // Top-left
      { x: window.innerWidth - padding - botSize, y: padding }, // Top-right
      { x: window.innerWidth - padding - botSize, y: window.innerHeight - padding - botSize }, // Bottom-right
      { x: padding, y: window.innerHeight - padding - botSize }, // Bottom-left
      { x: padding, y: padding }, // Back to start
    ];
  };

  useEffect(() => {
    if (!isScanning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const path = calculatePath();
    if (path.length === 0) return;

    let currentPathIndex = 0;
    let t = 0; // Interpolation factor (0-1)
    const speed = 0.01; // Animation speed

    const animate = () => {
      if (currentPathIndex >= path.length - 1) {
        // Loop back to start
        currentPathIndex = 0;
        t = 0;
      }

      const start = path[currentPathIndex];
      const end = path[currentPathIndex + 1];

      if (!start || !end) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Interpolate position
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;

      setPosition({ x, y });
      setPathIndex(currentPathIndex);

      t += speed;

      if (t >= 1) {
        t = 0;
        currentPathIndex++;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Recalculate position on resize
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isScanning) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Animated Bot */}
      <div
        className="absolute transition-all duration-100 ease-linear"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(0, 0)',
        }}
      >
        <div className="relative">
          {/* Bot Icon */}
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-blue-400 animate-pulse">
            <Shield className="text-white" size={20} />
          </div>
          
          {/* Status Text */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <div className="bg-blue-900/90 text-blue-200 px-3 py-1 rounded-lg text-xs font-mono shadow-lg border border-blue-500">
              {currentStatus}
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-900/90"></div>
          </div>

          {/* Progress Trail */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-blue-500/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scanning Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-purple-900/5 pointer-events-none" />
    </div>
  );
}

