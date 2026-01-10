import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft,
  Brain, 
  PieChart, 
  BarChart3, 
  Briefcase,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const WELCOME_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Asset Labs AI',
    subtitle: 'Your AI-powered investment companion',
    description: 'Build smarter portfolios with institutional-grade analytics, personalized insights, and AI-driven recommendations.',
    icon: Sparkles,
    color: 'from-primary to-purple-600',
    features: [
      { icon: Brain, text: 'AI-powered portfolio optimization' },
      { icon: TrendingUp, text: 'Real market data from Polygon.io' },
      { icon: Target, text: 'Personalized investment strategies' },
    ],
  },
  {
    id: 'investor-dna',
    title: 'Discover Your Investor DNA',
    subtitle: 'Take our 5-minute personality assessment',
    description: 'Like Myers-Briggs for investing — discover your unique investor personality type and get tailored recommendations.',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    action: { label: 'Take Assessment', href: '/investment-plan' },
    features: [
      { icon: CheckCircle2, text: '16 unique investor personality types' },
      { icon: CheckCircle2, text: 'Personalized asset allocation' },
      { icon: CheckCircle2, text: 'Famous investor match' },
    ],
  },
  {
    id: 'portfolio-builder',
    title: 'Build Your Portfolio',
    subtitle: 'Three ways to get started',
    description: 'Whether you\'re a beginner or expert, we have the right approach for you.',
    icon: PieChart,
    color: 'from-emerald-500 to-teal-500',
    action: { label: 'Start Building', href: '/portfolio-visualizer' },
    features: [
      { icon: Sparkles, text: 'AI Chat Advisor — conversational guidance' },
      { icon: Target, text: 'Quick Builder — for experienced investors' },
      { icon: Brain, text: 'Guided Questionnaire — comprehensive IPS' },
    ],
  },
  {
    id: 'market-intel',
    title: 'Stay Informed',
    subtitle: 'Real-time market intelligence',
    description: 'Track macro trends, commodities, currencies, and get AI-powered insights on market movements.',
    icon: BarChart3,
    color: 'from-blue-500 to-cyan-500',
    action: { label: 'Explore Markets', href: '/market-intel' },
    features: [
      { icon: CheckCircle2, text: 'Economic indicators & macro data' },
      { icon: CheckCircle2, text: 'Commodity & currency tracking' },
      { icon: CheckCircle2, text: 'AI-generated market insights' },
    ],
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    subtitle: 'Start your investment journey',
    description: 'Begin by discovering your investor personality type — it only takes 5 minutes and unlocks personalized recommendations.',
    icon: Rocket,
    color: 'from-emerald-500 to-primary',
    features: [],
    cta: true,
  },
];

export function WelcomeModal({ open, onOpenChange, onComplete }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = WELCOME_STEPS[currentStep];
  const isLast = currentStep === WELCOME_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onOpenChange(false);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-background border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {WELCOME_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentStep 
                      ? "w-6 bg-primary" 
                      : idx < currentStep 
                        ? "bg-primary/50" 
                        : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                step.color
              )}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-3 bg-primary/5 text-primary border-primary/20">
                {step.subtitle}
              </Badge>
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Features */}
            {step.features.length > 0 && (
              <div className="space-y-3 mb-6">
                {step.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                  >
                    <feature.icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTA for last step */}
            {step.cta && (
              <div className="space-y-3 mb-6">
                <Button 
                  size="lg" 
                  className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  onClick={() => {
                    onComplete();
                    onOpenChange(false);
                    window.location.href = '/investment-plan';
                  }}
                >
                  <Brain className="w-4 h-4" />
                  Take the Investor DNA Assessment
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={() => {
                    onComplete();
                    onOpenChange(false);
                    window.location.href = '/portfolio-visualizer';
                  }}
                >
                  <PieChart className="w-4 h-4" />
                  Build a Portfolio
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip tour
              </Button>
              
              <div className="flex gap-2">
                {!isFirst && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
                {!step.cta && (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="gap-1"
                  >
                    {isLast ? 'Get Started' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
