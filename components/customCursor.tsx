'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isClickable, setIsClickable] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  // Hook 1: Device detection & resize handling
  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      setIsHidden((prev) => (prev !== isMobile ? isMobile : prev));
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  // Hook 2: Custom cursor motion tracking and events with requestAnimationFrame smooth rendering
  useEffect(() => {
    if (isHidden) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let hasMoved = false;
    let animationFrameId: number;

    const updatePosition = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!hasMoved) {
        currentX = targetX;
        currentY = targetY;
        hasMoved = true;
        cursor.style.opacity = '1';
      }
    };

    const renderCursor = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      // Only update DOM style if there's actual motion, avoiding layout/reflow overhead when stationary
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        currentX += dx * 0.25;
        currentY += dy * 0.25;
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(renderCursor);
    };

    const handleMouseLeave = () => {
      cursor.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      cursor.style.opacity = '1';
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isHoveringClickable = target.closest('a, button, input, select, [role="button"]');
      setIsClickable(!!isHoveringClickable);
    };

    window.addEventListener('mousemove', updatePosition, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    animationFrameId = requestAnimationFrame(renderCursor);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isHidden]);

  if (isHidden) return null;

  return (
    <div
      ref={cursorRef}
      // Added opacity-0 initially so it doesn't flash in the corner on load
      // Added transition-opacity to fade in/out smoothly when entering/leaving the window
      className="fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform opacity-0 transition-opacity duration-300"
      style={{
        transform: 'translate3d(-100px, -100px, 0)',
      }}
    >
      <div className="relative -top-[2px] -left-[6px] text-black dark:text-white drop-shadow-md">
        {isClickable ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M22 14a8 8 0 0 1-8 8" />
            <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
            <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
            <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
            <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
          </svg>
        )}
      </div>
    </div>
  );
}