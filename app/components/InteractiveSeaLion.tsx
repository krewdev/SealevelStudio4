'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SealAnimation } from './SealAnimation';

interface InteractiveSeaLionProps {
  size?: number;
  className?: string;
  mode?: 'playful' | 'curious' | 'sleepy';
}

export function InteractiveSeaLion({ 
  size = 120, 
  className = '',
  mode = 'playful'
}: InteractiveSeaLionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [animationState, setAnimationState] = useState<'swimming' | 'peeking' | 'following' | 'dancing'>('swimming');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for following behavior
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Playful behaviors
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const behaviors = [
      'swimming',
      'peeking',
      'following',
      'dancing'
    ];

    let behaviorIndex = 0;
    const interval = setInterval(() => {
      // Randomly change behavior
      if (Math.random() > 0.7) {
        behaviorIndex = (behaviorIndex + 1) % behaviors.length;
        setAnimationState(behaviors[behaviorIndex] as any);
      }

      // Swimming: Move around the viewport
      if (animationState === 'swimming') {
        const newX = Math.random() * Math.max(0, window.innerWidth - size);
        const newY = Math.random() * Math.max(0, window.innerHeight - size);
        setPosition({ x: newX, y: newY });
      }

      // Peeking: Pop up from edges
      if (animationState === 'peeking') {
        const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let newX = 0, newY = 0;
        const width = window.innerWidth || 1920;
        const height = window.innerHeight || 1080;
        
        switch (edge) {
          case 0: // Top
            newX = Math.random() * Math.max(0, width - size);
            newY = -size * 0.5;
            break;
          case 1: // Right
            newX = width - size * 0.5;
            newY = Math.random() * Math.max(0, height - size);
            break;
          case 2: // Bottom
            newX = Math.random() * Math.max(0, width - size);
            newY = height - size * 0.5;
            break;
          case 3: // Left
            newX = -size * 0.5;
            newY = Math.random() * Math.max(0, height - size);
            break;
        }
        setPosition({ x: newX, y: newY });
        setIsVisible(true);
        
        // Hide after peeking
        setTimeout(() => setIsVisible(false), 2000);
      }

      // Following: Follow mouse cursor (but lag behind)
      if (animationState === 'following') {
        const targetX = mousePosition.x - size / 2;
        const targetY = mousePosition.y - size / 2;
        setPosition(prev => ({
          x: prev.x + (targetX - prev.x) * 0.1,
          y: prev.y + (targetY - prev.y) * 0.1,
        }));
      }

      // Dancing: Bounce around
      if (animationState === 'dancing') {
        const time = Date.now() * 0.001;
        const width = window.innerWidth || 1920;
        const height = window.innerHeight || 1080;
        setPosition({
          x: width / 2 + Math.sin(time) * 100 - size / 2,
          y: height / 2 + Math.cos(time * 1.5) * 100 - size / 2,
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [animationState, size, mousePosition]);

  // React to page scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      if (animationState === 'swimming') {
        // Swim away when scrolling
        setPosition(prev => ({
          x: prev.x + (Math.random() - 0.5) * 50,
          y: prev.y + (Math.random() - 0.5) * 50,
        }));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [animationState]);

  // React to clicks (splash effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClick = (e: MouseEvent) => {
      // Swim towards click location
      setPosition({
        x: e.clientX - size / 2,
        y: e.clientY - size / 2,
      });
      setAnimationState('swimming');
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [size]);

  if (!isVisible && animationState === 'peeking') return null;

  const getAnimationStyle = () => {
    if (typeof window === 'undefined') {
      return { display: 'none' };
    }
    
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex: 9998,
      pointerEvents: 'none',
      transition: animationState === 'following' ? 'none' : 'all 0.5s ease-out',
    };

    switch (animationState) {
      case 'swimming':
        return {
          ...baseStyle,
          transform: `translate(${Math.sin(Date.now() * 0.001) * 5}px, ${Math.cos(Date.now() * 0.001) * 5}px)`,
        };
      case 'peeking':
        return {
          ...baseStyle,
          transform: 'scale(0.8)',
          opacity: 0.7,
        };
      case 'following':
        return {
          ...baseStyle,
          transform: `rotate(${Math.atan2(mousePosition.y - position.y, mousePosition.x - position.x) * 180 / Math.PI}deg)`,
        };
      case 'dancing':
        return {
          ...baseStyle,
          transform: `rotate(${Date.now() * 0.1}deg) scale(${1 + Math.sin(Date.now() * 0.005) * 0.2})`,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`interactive-seal-lion ${className}`}
      style={getAnimationStyle()}
    >
      <SealAnimation size={size} />
    </div>
  );
}

