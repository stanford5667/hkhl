import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Brain, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickStartBannerProps {
  show: boolean;
  onDismiss: () => void;
  hasCompletedAssessment?: boolean;
}

export function QuickStartBanner({ show, onDismiss, hasCompletedAssessment = false }: QuickStartBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on certain pages
  if (!show || location.pathname === '/investment-plan' || location.pathname === '/auth') return null;

  // Show different banner if assessment completed
  if (hasCompletedAssessment) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-4 sm:mx-6 mt-4"
      >
        <div className={cn(
          "relative overflow-hidden rounded-xl",
          "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
          "border border-emerald-500/20"
        )}>
          <div className="relative p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Investor DNA Complete!</h3>
                <p className="text-xs text-muted-foreground">
                  Now build a portfolio matched to your style
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                onClick={() => navigate('/portfolio-visualizer')}
                className="gap-1.5"
              >
                Build Portfolio
                <ArrowRight className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0"
                onClick={onDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-4 sm:mx-6 mt-4"
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10",
        "border border-primary/20"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        
        <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Discover Your Investor DNA</h3>
                <Badge className="bg-primary/20 text-primary border-0 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  5 min
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Take our personality assessment to unlock personalized investment recommendations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => navigate('/investment-plan')}
              className="flex-1 sm:flex-none gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
            >
              Take Assessment
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
