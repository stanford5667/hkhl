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
      {/* Simple CSS-animated Logo */}
      <div className="relative animate-pulse">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
        
        {/* Logo container */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-3 border border-primary/30",
          config.logo
        )}>
          {/* Static "A" logo */}
          <svg
            viewBox="0 0 32 32"
            className="w-full h-full"
            fill="none"
          >
            <path
              d="M16 4L28 28H4L16 4Z"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 20H22"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Simple spinning dot */}
        <div className="absolute -inset-2 animate-spin" style={{ animationDuration: '2s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </div>

      {/* Brand name */}
      <div className="text-center">
        <h2 className={cn("font-bold text-foreground", config.text)}>
          Asset Labs AI
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {message}
        </p>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
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
