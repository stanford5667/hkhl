import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Asset Labs',
    subtitle: 'Your AI-powered investing copilot',
  },
  {
    id: 'golden-path',
    title: 'Your Personalized Journey',
    subtitle: 'Start with a 5-minute assessment',
  }
];

export function WelcomeModal({ open, onOpenChange, onComplete }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  
  const handleStartAssessment = () => {
    onComplete();
    onOpenChange(false);
    navigate('/investment-plan');
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleStartAssessment();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border gap-0">
        {/* Progress indicator */}
        <div className="px-4 sm:px-6 pt-4">
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1" />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 sm:p-6"
            >
              {/* Hero */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Welcome to Asset Labs</h2>
                <p className="text-sm text-muted-foreground">
                  Build smarter portfolios with AI
                </p>
              </div>

              {/* Value props - compact on mobile */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {[
                  { icon: Brain, text: 'Discover your investor personality', color: 'text-purple-500' },
                  { icon: Target, text: 'Get personalized recommendations', color: 'text-emerald-500' },
                  { icon: Zap, text: 'Analyze assets with AI', color: 'text-amber-500' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-secondary/30"
                  >
                    <item.icon className={cn("w-4 h-4 sm:w-5 sm:h-5 shrink-0", item.color)} />
                    <span className="text-xs sm:text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <Button onClick={handleNext} className="w-full gap-2" size="lg">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="w-full mt-2 text-muted-foreground text-xs sm:text-sm"
              >
                I'll explore on my own
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="golden-path"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 sm:p-6"
            >
              {/* Golden moment CTA */}
              <div className="text-center mb-4 sm:mb-6">
                <Badge className="mb-2 sm:mb-3 bg-primary/10 text-primary border-primary/20 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  5 min
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Discover Your Investor DNA</h2>
                <p className="text-muted-foreground text-xs sm:text-sm px-2">
                  Quick assessment reveals your investing style & unlocks personalized tips
                </p>
              </div>

              {/* Preview cards - 2x2 grid, smaller on mobile */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {[
                  { code: 'GAPC', name: 'Strategist', color: 'from-emerald-500/20 to-blue-500/20' },
                  { code: 'PAPC', name: 'Pioneer', color: 'from-purple-500/20 to-pink-500/20' },
                  { code: 'GIAD', name: 'Guardian', color: 'from-amber-500/20 to-orange-500/20' },
                  { code: 'PIAC', name: 'Maverick', color: 'from-cyan-500/20 to-blue-500/20' },
                ].map((type) => (
                  <div
                    key={type.code}
                    className={cn(
                      "p-2 sm:p-3 rounded-lg border border-border/50 bg-gradient-to-br text-center",
                      type.color
                    )}
                  >
                    <div className="font-mono text-[10px] sm:text-xs text-muted-foreground">{type.code}</div>
                    <div className="font-medium text-xs sm:text-sm">{type.name}</div>
                  </div>
                ))}
              </div>

              {/* Benefits - compact */}
              <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <h4 className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">What you'll get:</h4>
                <ul className="space-y-1">
                  {[
                    '4-letter investor code',
                    'Personalized strategy',
                    'AI portfolio tips',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Button onClick={handleStartAssessment} className="w-full gap-2 shadow-lg shadow-primary/25" size="lg">
                <Brain className="w-4 h-4" />
                Start Assessment
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="w-full mt-2 text-muted-foreground text-xs sm:text-sm"
              >
                Skip for now
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
