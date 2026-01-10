import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  PieChart, 
  BarChart3, 
  Sparkles,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function WelcomeModal({ open, onOpenChange, onComplete }: WelcomeModalProps) {
  const navigate = useNavigate();
  
  const handleAction = (path: string) => {
    onComplete();
    onOpenChange(false);
    navigate(path);
  };

  const handleDismiss = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">Welcome to Asset Labs AI</h2>
            <p className="text-muted-foreground text-sm">
              Build smarter portfolios with AI-powered analytics
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-4">
            <Button 
              variant="outline"
              className="w-full justify-start gap-3 h-12 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => handleAction('/investment-plan')}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">Discover Your Investor DNA</div>
                <div className="text-xs text-muted-foreground">5-min personality assessment</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start gap-3 h-12 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => handleAction('/portfolio-visualizer')}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">Build a Portfolio</div>
                <div className="text-xs text-muted-foreground">AI-assisted portfolio builder</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start gap-3 h-12 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => handleAction('/market-intel')}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">Explore Market Intel</div>
                <div className="text-xs text-muted-foreground">Real-time market data</div>
              </div>
            </Button>
          </div>

          {/* Skip */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            I'll explore on my own
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
