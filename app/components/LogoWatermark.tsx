'use client';

import React from 'react';

interface LogoWatermarkProps {
  opacity?: number;
  position?: string;
  scale?: number;
  rotation?: number;
}

export function LogoWatermark({ 
  opacity = 0.05, 
  position = 'center right',
  scale = 0.6,
  rotation = -5
}: LogoWatermarkProps) {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: 'url(/sea-level-logo.png)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: position,
        backgroundSize: 'contain',
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        filter: 'hue-rotate(90deg) saturate(75%) brightness(110%)',
      }}
      aria-hidden="true"
    />
  );
}

