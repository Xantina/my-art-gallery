import { useState, useEffect, useMemo } from 'react';
import xantinaLogo from '@/assets/Xantina Logo.png';

interface IntroAnimationProps {
  onComplete: () => void;
}

const particleColors = [
  'particle-gold',
  'particle-rose',
  'particle-teal',
  'particle-amber',
  'particle-violet',
  'particle-cyan',
];

export const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  const [isExiting, setIsExiting] = useState(false);

  // Generate random colorful particles
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${30 + Math.random() * 60}%`,
      delay: `${Math.random() * 2.5}s`,
      size: Math.random() * 6 + 3,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }));
  }, []);

  useEffect(() => {
    // Start exit animation after 3.5 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3500);

    // Complete after exit animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4300);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`intro-container ${isExiting ? 'intro-exit' : ''}`}>
      {/* Background */}
      <div className="intro-bg" />
      
      {/* Animated color layers */}
      <div className="color-layer color-layer-1" />
      <div className="color-layer color-layer-2" />
      <div className="color-layer color-layer-3" />
      <div className="color-layer color-layer-4" />
      <div className="color-layer color-layer-5" />
      
      {/* Paint stroke effects */}
      <div className="paint-stroke" />
      <div className="paint-stroke-2" />
      
      {/* Floating colorful particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`particle ${particle.color}`}
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
      
      {/* Main content */}
      <div className="intro-content">
                <img
          src={xantinaLogo}
          alt="Xantina Logo"
          className="intro-logo mx-auto w-64 md:w-96 h-auto"
         />
         <div className="intro-line" />
        <p className="intro-subtitle">Original Artworks</p>
      </div>
    </div>
  );
};
