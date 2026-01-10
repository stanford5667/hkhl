/**
 * Section Confetti Component
 * Celebration animation for completing questionnaire sections
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionConfettiProps {
  trigger: boolean;
  colors?: string[];
  particleCount?: number;
}

export function SectionConfetti({ 
  trigger, 
  colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'],
  particleCount = 30 
}: SectionConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 40,
        y: Math.random() * 30 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);

      const timeout = setTimeout(() => {
        setParticles([]);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [trigger, colors, particleCount]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
              initial={{
                opacity: 1,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, 1, 1],
                rotate: particle.rotation,
                y: [0, -100 - Math.random() * 100],
                x: (Math.random() - 0.5) * 100,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Mini celebration for inline use
export function MiniCelebration({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][i % 4],
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI * 2) / 8) * 30,
                y: Math.sin((i * Math.PI * 2) / 8) * 30,
                opacity: 0,
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
