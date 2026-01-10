import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, Brain, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FeatureSpotlightProps {
  show: boolean;
  onDismiss: () => void;
  hasCompletedAssessment?: boolean;
}

export function FeatureSpotlight({ show, onDismiss, hasCompletedAssessment = false }: FeatureSpotlightProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the investment plan page itself
  if (!show || location.pathname === '/investment-plan') return null;

  // If user has completed assessment, don't show spotlight
  if (hasCompletedAssessment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-xs"
      >
        <div className="relative bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent pointer-events-none" />
          
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6 z-10" 
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>

          {/* Content - more compact on mobile */}
          <div className="relative p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <h3 className="font-semibold text-xs sm:text-sm">Complete Setup</h3>
                  <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[9px] sm:text-[10px] px-1 sm:px-1.5">
                    <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                    5m
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                  Take the Investor DNA quiz for personalized tips
                </p>
                
                <Button 
                  size="sm" 
                  className="w-full gap-1 h-7 sm:h-8 text-xs"
                  onClick={() => {
                    navigate('/investment-plan');
                    onDismiss();
                  }}
                >
                  Start
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
