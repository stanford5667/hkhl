import { Lock } from 'lucide-react';
import { useUsage } from '@/contexts/UsageContext';
import { cn } from '@/lib/utils';

interface PremiumMessageGateProps {
  content: string;
  onUpgradeClick?: () => void;
}

export function PremiumMessageGate({ content, onUpgradeClick }: PremiumMessageGateProps) {
  const { showUpgradeModal } = useUsage();

  const handleClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      showUpgradeModal('premiumContent');
    }
  };

  return (
    <div 
      className="relative group cursor-pointer"
      onClick={handleClick}
    >
      {/* Blurred content */}
      <div className="blur-sm select-none pointer-events-none">
        <span className="text-sm">{content}</span>
      </div>

      {/* Overlay */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        "bg-gradient-to-r from-amber-500/10 to-orange-500/10",
        "rounded border border-amber-500/30",
        "opacity-0 group-hover:opacity-100 transition-opacity"
      )}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 rounded-full shadow-sm">
          <Lock className="h-3 w-3 text-amber-500" />
          <span className="text-xs font-medium text-amber-600">
            Upgrade to view
          </span>
        </div>
      </div>

      {/* Always visible lock icon */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
        <div className="p-1 bg-amber-500/10 rounded-full border border-amber-500/30">
          <Lock className="h-3 w-3 text-amber-500" />
        </div>
      </div>
    </div>
  );
}
