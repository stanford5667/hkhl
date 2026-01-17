import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FlaskConical, Play, TrendingUp, BarChart3, Target, 
  Zap, ArrowRight, Sparkles, CheckCircle2, Lock, Activity,
  Calendar, Percent, DollarSign
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

// Mock result preview data - showcasing the "magic" output
const MOCK_RESULT_PREVIEW = {
  studyName: 'After 3 Consecutive Down Days',
  ticker: 'SPY',
  period: '5 Years',
  occurrences: 127,
  winRate: 68.5,
  avgReturn: 1.87,
  avgGain: 2.94,
  avgLoss: -1.42,
  bestReturn: 8.21,
  worstReturn: -4.32,
  recentEvents: [
    { date: 'Jan 8, 2026', return: 2.1 },
    { date: 'Dec 15, 2025', return: -0.8 },
    { date: 'Nov 22, 2025', return: 3.4 },
  ]
};

export function QuantLabWelcomeHero({ 
  onSelectStudy, 
  onRunDemo, 
  isGuest, 
  onSignUp 
}: QuantLabWelcomeHeroProps) {
  const [hoveredStudy, setHoveredStudy] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-100px)] px-4 py-6 overflow-y-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl mx-auto"
      >
        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Left Column - Hero Text & CTA */}
          <div className="space-y-6 text-center lg:text-left">
            {/* Hero Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block"
            >
              <Badge 
                variant="outline" 
                className="px-4 py-1.5 text-sm border-primary/30 bg-primary/5"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                The No-Edge Quant Tool
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                <span className="text-foreground">Stop Guessing.</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-500 bg-clip-text text-transparent">
                  Start Knowing.
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                Turn market hunches into statistical proof. Ask questions like{' '}
                <span className="text-foreground font-medium italic">"What happens after 3 red days?"</span>
                {' '}and get real answers backed by data—not opinions.
              </p>
            </motion.div>

            {/* Benefits Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2"
            >
              {BENEFITS.map((benefit) => (
                <div 
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2"
            >
              <Button
                size="lg"
                onClick={onRunDemo}
                className="h-12 px-6 text-base gap-2 rounded-xl shadow-lg shadow-primary/20"
              >
                <Play className="h-5 w-5" />
                Run Your First Study
                <ArrowRight className="h-4 w-4" />
              </Button>

              {isGuest && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onSignUp}
                  className="h-12 px-6 text-base rounded-xl"
                >
                  Create Free Account
                </Button>
              )}
            </motion.div>

            {/* Quick Study Picker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4"
            >
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Or pick a study to explore
              </p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {FEATURED_STUDIES.map((study) => (
                  <button
                    key={study.id}
                    onClick={() => onSelectStudy(study.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      "bg-card hover:bg-muted/50 border-border hover:border-primary/50",
                      "text-sm font-medium"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br",
                      study.color
                    )}>
                      <study.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span>{study.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Live Result Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            {/* Glowing background effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-violet-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50" />
            
            {/* Result Card Preview */}
            <div className="relative bg-card border-2 border-primary/30 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{MOCK_RESULT_PREVIEW.studyName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {MOCK_RESULT_PREVIEW.ticker} • {MOCK_RESULT_PREVIEW.period}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Result
                  </Badge>
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="p-5 space-y-5">
                {/* Hero Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Win Rate - Hero Metric */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="col-span-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                      <Percent className="h-4 w-4" />
                      <span className="text-xs font-medium">Win Rate</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-500 font-mono">
                      {MOCK_RESULT_PREVIEW.winRate}%
                    </p>
                    <p className="text-[10px] text-emerald-500/70 mt-1">
                      of the time it goes UP
                    </p>
                  </motion.div>

                  {/* Avg Return */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="col-span-1 bg-primary/10 border border-primary/30 rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium">Avg Return</span>
                    </div>
                    <p className="text-3xl font-bold text-primary font-mono">
                      +{MOCK_RESULT_PREVIEW.avgReturn}%
                    </p>
                    <p className="text-[10px] text-primary/70 mt-1">
                      over next 5 days
                    </p>
                  </motion.div>

                  {/* Occurrences */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: 'spring' }}
                    className="col-span-1 bg-muted/50 border border-border rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium">Sample Size</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground font-mono">
                      {MOCK_RESULT_PREVIEW.occurrences}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      times this happened
                    </p>
                  </motion.div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Gain</p>
                    <p className="text-lg font-bold text-emerald-500 font-mono">+{MOCK_RESULT_PREVIEW.avgGain}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Loss</p>
                    <p className="text-lg font-bold text-red-500 font-mono">{MOCK_RESULT_PREVIEW.avgLoss}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best</p>
                    <p className="text-lg font-bold text-emerald-400 font-mono">+{MOCK_RESULT_PREVIEW.bestReturn}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Worst</p>
                    <p className="text-lg font-bold text-red-400 font-mono">{MOCK_RESULT_PREVIEW.worstReturn}%</p>
                  </div>
                </div>

                {/* Recent Events Preview */}
                <div className="bg-muted/20 rounded-xl p-3 border border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recent Occurrences
                  </p>
                  <div className="space-y-1.5">
                    {MOCK_RESULT_PREVIEW.recentEvents.map((event, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + idx * 0.1 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{event.date}</span>
                        <span className={cn(
                          "font-mono font-semibold",
                          event.return >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          {event.return >= 0 ? '+' : ''}{event.return}%
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA in card */}
                <div className="pt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                    This is what you'll see when you run a study
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Annotation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
            >
              ← Real analysis output
            </motion.div>
          </motion.div>
        </div>

        {/* Trust Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center pt-8"
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
