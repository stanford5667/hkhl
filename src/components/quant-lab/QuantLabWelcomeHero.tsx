import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FlaskConical, Play, TrendingUp, BarChart3, Target, 
  Zap, ArrowRight, Sparkles, CheckCircle2, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantLabWelcomeHeroProps {
  onSelectStudy: (studyId: string) => void;
  onRunDemo: () => void;
  isGuest: boolean;
  onSignUp: () => void;
}

// Featured studies to showcase
const FEATURED_STUDIES = [
  {
    id: 'after_consecutive_days',
    name: 'After Consecutive Days',
    description: 'What happens after 3+ up/down days in a row?',
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-600',
    result: { winRate: 67, avgReturn: 2.1 }
  },
  {
    id: 'rsi_analysis',
    name: 'RSI Oversold Bounce',
    description: 'Does buying oversold stocks actually work?',
    icon: Target,
    color: 'from-blue-500 to-indigo-600',
    result: { winRate: 71, avgReturn: 3.2 }
  },
  {
    id: 'gap_analysis',
    name: 'Gap Fill Analysis',
    description: 'Do gaps really fill? Find out statistically.',
    icon: BarChart3,
    color: 'from-violet-500 to-purple-600',
    result: { winRate: 58, avgReturn: 0.8 }
  }
];

const BENEFITS = [
  'Backtest any strategy in seconds',
  'No coding required',
  'Real historical data',
  'AI-powered insights'
];

export function QuantLabWelcomeHero({ 
  onSelectStudy, 
  onRunDemo, 
  isGuest, 
  onSignUp 
}: QuantLabWelcomeHeroProps) {
  const [hoveredStudy, setHoveredStudy] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8 overflow-y-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-4xl mx-auto text-center space-y-8"
      >
        {/* Hero Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Badge 
            variant="outline" 
            className="px-4 py-1.5 text-sm border-primary/30 bg-primary/5"
          >
            <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
            Wall Street Analysis • Made Simple
          </Badge>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-foreground">Discover What</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-500 bg-clip-text text-transparent">
              Actually Moves Stocks
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Run professional-grade quantitative studies on any stock. 
            Get data-driven answers to questions like{' '}
            <span className="text-foreground font-medium">"What happens after 3 red days?"</span>
          </p>
        </motion.div>

        {/* Benefits Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {BENEFITS.map((benefit, i) => (
            <div 
              key={benefit}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{benefit}</span>
            </div>
          ))}
        </motion.div>

        {/* Featured Studies Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Pick a study to explore
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {FEATURED_STUDIES.map((study, index) => (
              <motion.button
                key={study.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => onSelectStudy(study.id)}
                onMouseEnter={() => setHoveredStudy(study.id)}
                onMouseLeave={() => setHoveredStudy(null)}
                className={cn(
                  "relative group text-left p-5 rounded-2xl border-2 transition-all duration-300",
                  "bg-card hover:bg-muted/50",
                  hoveredStudy === study.id 
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" 
                    : "border-border hover:border-primary/50"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                  "bg-gradient-to-br",
                  study.color
                )}>
                  <study.icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-foreground mb-1">
                  {study.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {study.description}
                </p>

                {/* Teaser Stats */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-500 font-bold">{study.result.winRate}%</span>
                    <span className="text-muted-foreground">win rate</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <span className="text-primary font-bold">+{study.result.avgReturn}%</span>
                    <span className="text-muted-foreground">avg</span>
                  </div>
                </div>

                {/* Hover Arrow */}
                <div className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300",
                  hoveredStudy === study.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                )}>
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="pt-6 space-y-4"
        >
          <Button
            size="lg"
            onClick={onRunDemo}
            className="h-14 px-8 text-lg gap-3 rounded-xl shadow-lg shadow-primary/20"
          >
            <Play className="h-5 w-5" />
            Run Your First Study
            <ArrowRight className="h-5 w-5" />
          </Button>

          {isGuest && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5 inline mr-1" />
                Create a free account to save studies & unlock all features
              </p>
              <Button
                variant="link"
                onClick={onSignUp}
                className="text-primary font-semibold"
              >
                Sign up free →
              </Button>
            </div>
          )}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pt-8 text-center"
        >
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-semibold text-foreground">10+ years</span> of historical market data
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
