import { BarChart3 } from 'lucide-react';
import { UnifiedDiscoveryScreener } from './UnifiedDiscoveryScreener';

export function MarketIntelligenceSection() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Market Intelligence</h2>
          <p className="text-[10px] text-muted-foreground">Screeners and market-moving news</p>
        </div>
      </div>
      
      <UnifiedDiscoveryScreener />
    </section>
  );
}
