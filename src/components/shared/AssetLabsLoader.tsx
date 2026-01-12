import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AssetLabsLoaderProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AssetLabsLoader = ({ 
  message = 'Loading...', 
  progress = 0,
  showProgress = false,
  size = 'md',
  className 
}: AssetLabsLoaderProps) => {
  const sizeConfig = {
    sm: { logo: 'h-8 w-8', text: 'text-lg', container: 'gap-3' },
    md: { logo: 'h-12 w-12', text: 'text-xl', container: 'gap-4' },
    lg: { logo: 'h-16 w-16', text: 'text-2xl', container: 'gap-5' },
  };
  
  const config = sizeConfig[size];

  return (
    <div className={cn("flex flex-col items-center justify-center", config.container, className)}>
      {/* Animated Logo */}
      <motion.div
        className="relative"
        animate={{ 
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
        
        {/* Logo container */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-3 border border-primary/30",
          config.logo
        )}>
          {/* Animated "A" logo */}
          <svg
            viewBox="0 0 32 32"
            className="w-full h-full"
            fill="none"
          >
            <motion.path
              d="M16 4L28 28H4L16 4Z"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M10 20H22"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Orbiting dots */}
        <motion.div
          className="absolute -inset-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>

      {/* Brand name */}
      <div className="text-center">
        <motion.h2 
          className={cn("font-bold text-foreground", config.text)}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Asset Labs AI
        </motion.h2>
        <p className="text-sm text-muted-foreground mt-1">
          {message}
        </p>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
};
