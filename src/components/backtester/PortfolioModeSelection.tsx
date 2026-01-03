// Portfolio Mode Selection - "Build from Scratch" vs "AI Suggestion"
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Brain,
  Scale
} from 'lucide-react';
import { PortfolioMode } from '@/types/portfolio';
import { cn } from '@/lib/utils';

interface PortfolioModeSelectionProps {
  selectedMode: PortfolioMode | null;
  onModeSelect: (mode: PortfolioMode) => void;
}

export function PortfolioModeSelection({ selectedMode, onModeSelect }: PortfolioModeSelectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Manual Mode */}
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg",
          selectedMode === 'manual' 
            ? "ring-2 ring-primary border-primary" 
            : "hover:border-primary/50"
        )}
        onClick={() => onModeSelect('manual')}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Wrench className="h-6 w-6 text-blue-500" />
            </div>
            {selectedMode === 'manual' && (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2">Build from Scratch</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Select specific tickers and assign your own target weights. 
            We'll analyze your choices using the Black-Litterman model.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4 text-blue-500" />
              <span>Custom weight allocation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-blue-500" />
              <span>Black-Litterman risk analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <span>Implied vs actual risk comparison</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
              Full Control
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Mode */}
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg",
          selectedMode === 'ai' 
            ? "ring-2 ring-primary border-primary" 
            : "hover:border-primary/50"
        )}
        onClick={() => onModeSelect('ai')}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            {selectedMode === 'ai' && (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2">AI Suggestion</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Let our robo-advisor generate an optimal portfolio based on your 
            profile using Hierarchical Risk Parity (HRP).
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>HRP-optimized weights</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4 text-purple-500" />
              <span>JP Morgan 60/40+ framework</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-purple-500" />
              <span>Correlation-based clustering</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
              Recommended
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
