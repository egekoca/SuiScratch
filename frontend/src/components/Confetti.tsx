import { useEffect, useState } from 'react';

export const Confetti = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Hide confetti after animation completes (max 5 seconds)
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex justify-center">
      {[...Array(60)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-20%`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 0.5}s`,
            background: `linear-gradient(${Math.random() * 360}deg, #fff, ${['#60a5fa', '#fbbf24', '#f472b6'][i % 3]})`,
            width: Math.random() * 10 + 6 + 'px',
            height: Math.random() * 12 + 6 + 'px',
            boxShadow: '0 0 10px rgba(255,255,255,0.8)',
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
};

