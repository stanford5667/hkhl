import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Brain, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickStartBannerProps {
  show: boolean;
  onDismiss: () => void;
}

export function QuickStartBanner({ show, onDismiss }: QuickStartBannerProps) {
  const navigate = useNavigate();

  if (!show) return null;

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
