import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TriggerBannerProps {
  greeting: string;
  alertCount: number;
  portfolioNews?: string;
  onReview?: () => void;
}

export function TriggerBanner({ greeting, alertCount, portfolioNews, onReview }: TriggerBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-success/10 border border-primary/20 p-6">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{greeting}</h2>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{alertCount} item{alertCount !== 1 ? 's' : ''}</span> need attention
            {portfolioNews && (
              <>
                {' '}and <span className="text-success font-medium">{portfolioNews}</span>
              </>
            )}
          </p>
        </div>
        
        <Button onClick={onReview} className="group">
          Review Now
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}