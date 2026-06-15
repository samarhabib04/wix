
import React, { useCallback, useEffect, useRef } from 'react';

interface ConfettiProps {
  numberOfPieces?: number;
  recycle?: boolean;
  tweenDuration?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ 
  numberOfPieces = 200,
  recycle = false,
  tweenDuration = 5000
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const colors = [
    '#738A6E', // brand-soft-green
    '#344C3D', // brand-dark-green
    '#BFCFBB', // brand-light-green
    '#fde68a', // amber-200
    '#fcd34d', // amber-300
  ];

  const createConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    for (let i = 0; i < numberOfPieces; i++) {
      confettiRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h - h,
        r: Math.random() * 6 + 2, // Radius
        d: Math.random() * numberOfPieces, // Density
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        opacity: Math.random() + 0.5,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
        tiltAngle: 0
      });
    }
  }, [numberOfPieces, colors]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < confettiRef.current.length; i++) {
      const confetto = confettiRef.current[i];
      ctx.beginPath();
      ctx.lineWidth = confetto.r / 2;
      ctx.strokeStyle = confetto.color;
      ctx.fillStyle = confetto.color;
      ctx.globalAlpha = confetto.opacity;
      
      ctx.moveTo(confetto.x, confetto.y);
      
      if (confetto.shape === 'circle') {
        ctx.arc(confetto.x, confetto.y, confetto.r, 0, Math.PI * 2);
      } else {
        ctx.save();
        ctx.translate(confetto.x, confetto.y);
        ctx.rotate(confetto.tiltAngle);
        ctx.rect(-confetto.r, -confetto.r/2, confetto.r * 2, confetto.r);
        ctx.restore();
      }
      
      ctx.fill();
      
      confetto.tiltAngle += 0.1;
      confetto.y += 0.7 + confetto.r / 3;
      confetto.x += Math.sin(confetto.d) * 0.5;
      
      if (confetto.y > canvas.height) {
        if (recycle) {
          confetto.y = -10;
          confetto.x = Math.random() * canvas.width;
        } else {
          confettiRef.current.splice(i, 1);
          i--;
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(draw);
  }, [recycle]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    confettiRef.current = [];
    createConfetti();
    draw();
    
    // If not recycling, just stop the animation after the tweenDuration
    if (!recycle) {
      const timer = setTimeout(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }, tweenDuration);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [createConfetti, draw, recycle, resizeCanvas, tweenDuration]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        pointerEvents: 'none', 
        zIndex: 50
      }}
    />
  );
};
