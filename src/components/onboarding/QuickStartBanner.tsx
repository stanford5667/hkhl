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
        className="mx-2 sm:mx-4 md:mx-6 mt-2 sm:mt-4"
      >
        <div className={cn(
          "relative overflow-hidden rounded-lg sm:rounded-xl",
          "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
          "border border-emerald-500/20"
        )}>
          <div className="relative p-2.5 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-xs sm:text-sm truncate">DNA Complete!</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Build your matched portfolio
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button 
                size="sm"
                onClick={() => navigate('/portfolio-visualizer')}
                className="gap-1 h-7 sm:h-8 text-xs px-2 sm:px-3"
              >
                <span className="hidden xs:inline">Build</span> Portfolio
                <ArrowRight className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                onClick={onDismiss}
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
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
      className="mx-2 sm:mx-4 md:mx-6 mt-2 sm:mt-4"
    >
      <div className={cn(
        "relative overflow-hidden rounded-lg sm:rounded-xl",
        "bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10",
        "border border-primary/20"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        
        <div className="relative p-2.5 sm:p-4 md:p-5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate">Investor DNA</h3>
                <Badge className="bg-primary/20 text-primary border-0 text-[9px] sm:text-xs px-1 sm:px-1.5 shrink-0">
                  <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                  5m
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-1">
                Get personalized investment tips
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button 
              onClick={() => navigate('/investment-plan')}
              className="gap-1 sm:gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 h-7 sm:h-8 md:h-9 text-xs px-2 sm:px-3"
            >
              <span className="hidden xs:inline">Take</span> Quiz
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 shrink-0"
              onClick={onDismiss}
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
