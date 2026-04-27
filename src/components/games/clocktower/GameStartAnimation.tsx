'use client';

import { useState, useEffect } from 'react';

interface GameStartAnimationProps {
  onComplete: () => void;
}

/**
 * Full-screen countdown animation when host starts the game.
 * Shows 3...2...1 → "The Night Has Come" → fades out.
 */
export default function GameStartAnimation({ onComplete }: GameStartAnimationProps) {
  const [step, setStep] = useState(0); // 0=3, 1=2, 2=1, 3=text, 4=done

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2000),
      setTimeout(() => setStep(3), 3000),
      setTimeout(() => setStep(4), 4500),
      setTimeout(() => onComplete(), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const countdownValues = ['3', '2', '1'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-overlay-in"
      style={{ background: 'radial-gradient(circle at center, rgba(15,10,30,0.97) 0%, rgba(10,5,20,0.99) 100%)' }}
    >
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-sparkle"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0
                ? 'rgba(168, 85, 247, 0.6)'
                : i % 3 === 1
                ? 'rgba(56, 189, 248, 0.6)'
                : 'rgba(251, 191, 36, 0.4)',
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Countdown numbers */}
      {step < 3 && (
        <div key={step} className="animate-countdown">
          <span
            className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300"
            style={{ textShadow: '0 0 80px rgba(168, 85, 247, 0.5)' }}
          >
            {countdownValues[step]}
          </span>
        </div>
      )}

      {/* "Night has come" text */}
      {step === 3 && (
        <div className="text-center animate-scale-in">
          <div className="text-7xl mb-6">🌙</div>
          <h1
            className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-cyan-300 mb-4"
          >
            The Night Has Come
          </h1>
          <p className="text-lg text-slate-400 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Close your eyes and await your fate...
          </p>
        </div>
      )}

      {/* Fade out */}
      {step === 4 && (
        <div className="fixed inset-0 bg-black/80 animate-fade-in" />
      )}
    </div>
  );
}
