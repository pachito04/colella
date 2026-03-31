'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // Configuration
    const particleCountMobile = 40;
    const particleCountDesktop = 100;
    const connectionDistance = 240;
    const mouseDistance = 200;
    
    // Colors based on "Fascia Network" aesthetic: Cyan, Electric Blue, White
    const colors = ['#00ffff', '#00bfff', '#ffffff', '#e0ffff']; 

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Mouse state
    const mouse = { x: -1000, y: -1000 };

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const isMobile = width < 768;
      const count = isMobile ? particleCountMobile : particleCountDesktop;

      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          // Extremely slow organic movement ("despacito")
          vx: (Math.random() - 0.5) * 0.2, 
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 3 + 2, // Size between 2 and 5
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background explicitly if needed, but CSS handles it usually. 
      // We will let CSS handle the dark background color to allow for easy changes.

      // Update and Draw Particles
      particles.forEach((p, i) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges (keep them inside mostly, or wrap around - wrapping is more "organic" feel usually, 
        // but bouncing keeps density constant easier. Let's bounce gently.)
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction: Subtle repulsion
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouseDistance) {
            const forceDirectionX = dxMouse / distMouse;
            const forceDirectionY = dyMouse / distMouse;
            const force = (mouseDistance - distMouse) / mouseDistance;
            const directionX = forceDirectionX * force * 0.2; // Gentle push
            const directionY = forceDirectionY * force * 0.2;

            p.x -= directionX;
            p.y -= directionY;
        }

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for lines potentially

        // Draw Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Opacity based on distance
            const opacity = 1 - distance / connectionDistance;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 255, ${opacity * 0.3})`; // Cyan-ish connections
            ctx.lineWidth = 1.1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    // Event Listeners
    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Initial setup
    init();
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none"
      style={{
        backgroundColor: '#0a0a1a', // Deep Blue/Black
      }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};

export default ParticleBackground;
