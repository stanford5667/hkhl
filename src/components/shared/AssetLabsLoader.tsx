import { cn } from '@/lib/utils';
import { AssetLabsMark } from '@/components/brand/AssetLabsMark';

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
  className,
}: AssetLabsLoaderProps) => {
  const sizeConfig = {
    sm: { logo: 'h-10 w-10', text: 'text-lg', container: 'gap-3' },
    md: { logo: 'h-14 w-14', text: 'text-xl', container: 'gap-4' },
    lg: { logo: 'h-20 w-20', text: 'text-2xl', container: 'gap-5' },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center justify-center', config.container, className)}>
      {/* The mark plots itself in, then holds with a subtle breath */}
      <div className={cn('al-mark-breathe text-primary', config.logo)}>
        <AssetLabsMark animated />
      </div>

      {/* Brand name */}
      <div className="text-center">
        <h2 className={cn('font-bold tracking-[-0.02em] text-foreground', config.text)}>
          Asset Labs AI
        </h2>
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {message}
        </p>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
};
