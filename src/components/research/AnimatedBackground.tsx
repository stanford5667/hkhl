import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Dark terminal grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.6) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.6) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Horizontal scanlines */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            hsl(var(--primary) / 0.3) 2px,
            hsl(var(--primary) / 0.3) 3px
          )`,
        }}
      />

      {/* Subtle corner glow - primary */}
      <motion.div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)' }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle corner glow - success */}
      <motion.div
        className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--success) / 0.04) 0%, transparent 70%)' }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,hsl(var(--background))_100%)]" />
    </div>
  );
}
