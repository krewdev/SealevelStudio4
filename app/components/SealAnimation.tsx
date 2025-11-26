'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SealAnimationProps {
  size?: number;
  className?: string;
}

export function SealAnimation({ size = 200, className = '' }: SealAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>();
  const [useVideo, setUseVideo] = useState(false);
  const [videoChecked, setVideoChecked] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    let frame = 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const bodyWidth = size * 0.4;
    const bodyHeight = size * 0.3;

    const drawSeaLion = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(centerX, centerY);

      // Animation: gentle bobbing/swimming motion
      const bobOffset = Math.sin(frame * 0.05) * 5;
      const swimOffset = Math.sin(frame * 0.03) * 3;
      ctx.translate(swimOffset, bobOffset);

      // Outer glow (blue water effect)
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
      glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      glowGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
      glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main body (torpedo/ellipse shape)
      const bodyGradient = ctx.createLinearGradient(-bodyWidth, 0, bodyWidth, 0);
      bodyGradient.addColorStop(0, '#3b82f6'); // blue-500
      bodyGradient.addColorStop(0.5, '#2563eb'); // blue-600
      bodyGradient.addColorStop(1, '#1e40af'); // blue-800
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body outline
      ctx.strokeStyle = '#60a5fa'; // blue-400
      ctx.lineWidth = 2;
      ctx.stroke();

      // Head (front of body)
      const headSize = bodyHeight * 0.8;
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.arc(bodyWidth * 0.7, 0, headSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Flippers (front)
      const flipperOffset = Math.sin(frame * 0.1) * 10; // Animated flipper movement
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      // Left front flipper
      ctx.ellipse(bodyWidth * 0.3, -bodyHeight * 0.6 + flipperOffset, bodyWidth * 0.15, bodyHeight * 0.3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Right front flipper
      ctx.ellipse(bodyWidth * 0.3, bodyHeight * 0.6 - flipperOffset, bodyWidth * 0.15, bodyHeight * 0.3, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Back flippers
      ctx.beginPath();
      // Left back flipper
      ctx.ellipse(-bodyWidth * 0.7, -bodyHeight * 0.5, bodyWidth * 0.2, bodyHeight * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Right back flipper
      ctx.ellipse(-bodyWidth * 0.7, bodyHeight * 0.5, bodyWidth * 0.2, bodyHeight * 0.4, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bodyWidth * 0.85, -headSize * 0.3, headSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.arc(bodyWidth * 0.85, -headSize * 0.3, headSize * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Whiskers (subtle)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const whiskerY = -headSize * 0.1 + (i - 1) * headSize * 0.15;
        ctx.beginPath();
        ctx.moveTo(bodyWidth * 0.9, whiskerY);
        ctx.lineTo(bodyWidth * 1.1, whiskerY);
        ctx.stroke();
      }

      // Highlight on body
      const highlightGradient = ctx.createLinearGradient(-bodyWidth * 0.5, -bodyHeight, bodyWidth * 0.5, bodyHeight);
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.ellipse(0, -bodyHeight * 0.3, bodyWidth * 0.6, bodyHeight * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water bubbles (optional decorative effect)
      const bubbleCount = 5;
      for (let i = 0; i < bubbleCount; i++) {
        const bubbleX = (Math.sin(frame * 0.02 + i) * size * 0.3);
        const bubbleY = (Math.cos(frame * 0.03 + i) * size * 0.3);
        const bubbleSize = 2 + Math.sin(frame * 0.05 + i) * 1;
        ctx.fillStyle = 'rgba(147, 197, 253, 0.4)'; // blue-300 with opacity
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Update frame counter
      frame += 1;

      // Continue animation
      animationRef.current = requestAnimationFrame(drawSeaLion);
    };

    // Start animation
    drawSeaLion();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size]);

  // Prioritize video over canvas animation
  useEffect(() => {
    // Always start with canvas, then check for video in the background
    setUseVideo(false);
    setVideoChecked(false);
    
    const checkVideo = async () => {
      try {
        // Simple check - try to fetch the video file
        const response = await fetch('/sea-lion-animation.mp4', { method: 'HEAD' });
        if (response.ok) {
          setUseVideo(true);
          setVideoChecked(true);
          return;
        }

        // Try alternate video
        const altResponse = await fetch('/sea-lion-animation.1mp4', { method: 'HEAD' });
        if (altResponse.ok) {
          setUseVideo(true);
          setVideoChecked(true);
          return;
        }

        setVideoChecked(true);
        setUseVideo(false);
      } catch (error) {
        setVideoChecked(true);
        setUseVideo(false);
      }
    };

    // Check after a short delay - don't block rendering
    const timeoutId = setTimeout(checkVideo, 200);
    return () => clearTimeout(timeoutId);
  }, []);

  // Always render canvas, but hide it when video is available
  return (
    <div className={`relative flex items-center justify-center ${className}`}
         style={{ width: size, height: size }}>
      {/* Canvas animation - always rendered */}
      <canvas
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: useVideo && videoChecked ? 'none' : 'block'
        }}
      />
      
      {/* Video - shown only when available and checked */}
      {useVideo && videoChecked && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="seal-animation"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('Video failed to load, using canvas animation');
            setUseVideo(false);
          }}
          onLoadedData={() => {
            console.log('Video loaded and ready to play');
          }}
        >
          <source src="/sea-lion-animation.mp4" type="video/mp4" />
          <source src="/sea-lion-animation.1mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}

