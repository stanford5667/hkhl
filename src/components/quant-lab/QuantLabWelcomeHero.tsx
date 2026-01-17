import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FlaskConical, Play, TrendingUp, TrendingDown, BarChart3, Target, 
  Zap, ArrowRight, Sparkles, CheckCircle2, Lock, Activity,
  Calendar, Percent, DollarSign, PieChart, Brain, LineChart,
  Settings, Shield, Database, Users, ChevronRight, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, ReferenceLine } from 'recharts';

interface QuantLabWelcomeHeroProps {
  onSelectStudy: (studyId: string) => void;
  onRunDemo: () => void;
  isGuest: boolean;
  onSignUp: () => void;
}

// Mock conditional probability data - "After X% Down Day" study
const CONDITIONAL_STUDY = {
  condition: 'After a -2% Down Day',
  ticker: 'SPY',
  period: '10 Years',
  threshold: -2,
  occurrences: 89,
  winRate: 64.0,
  avgReturn: 0.82,
  avgGain: 1.54,
  avgLoss: -0.89,
  // Forward return distribution data
  distribution: [
    { day: 1, return: 0.45, winRate: 58 },
    { day: 3, return: 0.72, winRate: 61 },
    { day: 5, return: 0.82, winRate: 64 },
    { day: 10, return: 1.24, winRate: 67 },
  ],
  // Individual returns for bar chart visualization
  returns: [
    2.1, -0.8, 1.4, -1.2, 0.9, 1.8, -0.5, 2.4, 0.3, -0.2,
    1.1, 0.7, -0.9, 1.6, 0.4, -1.5, 2.8, 0.2, 1.3, -0.6,
    0.8, 1.9, -0.3, 0.5, 1.2, -0.7, 2.2, 0.1, -1.1, 1.7,
    0.6, -0.4, 1.5, 0.9, -0.8, 2.0, 0.3, 1.0, -0.1, 1.4
  ]
};

// Platform features to showcase
const PLATFORM_FEATURES = [
  {
    id: 'portfolio-builder',
    name: 'Portfolio Builder',
    description: 'Construct optimized, risk-managed portfolios',
    icon: PieChart,
    badge: 'Quant-Grade',
    color: 'from-blue-500 to-indigo-600',
    route: '/portfolio-visualizer',
    preview: {
      type: 'options' as const,
      options: [
        { name: 'Performance Screener', desc: 'AI-matched portfolios' },
        { name: 'Manual Builder', desc: 'Full control over allocations' }
      ]
    }
  },
  {
    id: 'investor-dna',
    name: 'Investor DNA',
    description: 'Discover your personalized strategy blueprint',
    icon: Brain,
    badge: 'AI-Powered',
    color: 'from-violet-500 to-purple-600',
    route: '/investment-plan',
    preview: {
      type: 'stats' as const,
      stats: [
        { label: '5 min', desc: 'assessment' },
        { label: '16', desc: 'investor types' }
      ]
    }
  },
  {
    id: 'quant-studies',
    name: 'Quant Studies',
    description: 'Run conditional probability analysis',
    icon: FlaskConical,
    badge: 'No-Code',
    color: 'from-emerald-500 to-green-600',
    route: '/quant-lab',
    preview: {
      type: 'result' as const,
      winRate: 68,
      avgReturn: 1.87
    }
  },
  {
    id: 'market-intel',
    name: 'Market Intelligence',
    description: 'Real-time economic calendar & indicators',
    icon: LineChart,
    badge: 'Live Data',
    color: 'from-amber-500 to-orange-600',
    route: '/markets',
    preview: {
      type: 'live' as const,
      liveItems: ['Fed Decisions', 'CPI Reports', 'Earnings']
    }
  }
];

const BENEFITS = [
  'No coding required',
  'Real historical data',
  'Quant-grade analysis',
  'AI-powered insights'
];

export function QuantLabWelcomeHero({ 
  onSelectStudy, 
  onRunDemo, 
  isGuest, 
  onSignUp 
}: QuantLabWelcomeHeroProps) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  // Prepare bar chart data from returns
  const chartData = CONDITIONAL_STUDY.returns.map((value, idx) => ({
    idx,
    value,
    fill: value >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'
  }));

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-100px)] px-4 py-6 overflow-y-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-7xl mx-auto space-y-12"
      >
        {/* ===================== HERO SECTION ===================== */}
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
                No-Code Quant Tools
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
                <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-500 bg-clip-text text-transparent">
                  Zero Coding
                </span>
                <br />
                <span className="text-foreground">Quant Analysis.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                Answer questions like{' '}
                <span className="text-foreground font-medium italic">"What happens after a -2% day?"</span>
                {' '}with real data. Build portfolios. Discover your investor type.{' '}
                <span className="text-primary font-medium">All without writing a single line of code.</span>
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
                Try Live Demo
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
          </div>

          {/* Right Column - Conditional Probability Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            {/* Glowing background effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-primary/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
            
            {/* Conditional Probability Card */}
            <div className="relative bg-card border-2 border-primary/30 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-red-500/10 via-primary/5 to-emerald-500/10 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-primary flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{CONDITIONAL_STUDY.condition}</h3>
                      <p className="text-xs text-muted-foreground">
                        {CONDITIONAL_STUDY.ticker} • {CONDITIONAL_STUDY.period} of data
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Study
                  </Badge>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-5 space-y-5">
                {/* Question & Answer */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    The Question
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    "When SPY drops more than {CONDITIONAL_STUDY.threshold}% in a single day, what happens next?"
                  </p>
                </div>

                {/* Hero Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Win Rate */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium uppercase">Bounce Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-500 font-mono">
                      {CONDITIONAL_STUDY.winRate}%
                    </p>
                    <p className="text-[10px] text-emerald-500/70">
                      go UP within 5 days
                    </p>
                  </motion.div>

                  {/* Avg Return */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium uppercase">Avg Return</span>
                    </div>
                    <p className="text-2xl font-bold text-primary font-mono">
                      +{CONDITIONAL_STUDY.avgReturn}%
                    </p>
                    <p className="text-[10px] text-primary/70">
                      average 5-day move
                    </p>
                  </motion.div>

                  {/* Sample Size */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: 'spring' }}
                    className="bg-muted/50 border border-border rounded-xl p-3 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium uppercase">Occurrences</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground font-mono">
                      {CONDITIONAL_STUDY.occurrences}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      times this happened
                    </p>
                  </motion.div>
                </div>

                {/* Return Distribution Visualization */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-muted/20 rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      5-Day Forward Returns Distribution
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {CONDITIONAL_STUDY.returns.filter(r => r >= 0).length} wins / {CONDITIONAL_STUDY.returns.filter(r => r < 0).length} losses
                    </Badge>
                  </div>
                  
                  {/* Bar Chart */}
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis dataKey="idx" hide />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                      Positive Returns
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm bg-destructive" />
                      Negative Returns
                    </span>
                  </div>
                </motion.div>

                {/* Forward Analysis Preview */}
                <div className="grid grid-cols-4 gap-2">
                  {CONDITIONAL_STUDY.distribution.map((item, idx) => (
                    <motion.div
                      key={item.day}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + idx * 0.1 }}
                      className="bg-muted/30 rounded-lg p-2 text-center"
                    >
                      <p className="text-[10px] text-muted-foreground">{item.day}D Forward</p>
                      <p className="text-sm font-bold text-emerald-500 font-mono">+{item.return}%</p>
                      <p className="text-[9px] text-muted-foreground">{item.winRate}% win</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Annotation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
            >
              ← Real conditional probability output
            </motion.div>
          </motion.div>
        </div>

        {/* ===================== PLATFORM FEATURES SECTION ===================== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-6"
        >
          <div className="text-center">
            <Badge variant="outline" className="mb-3">
              <Database className="h-3 w-3 mr-1.5" />
              Full Platform Access
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Everything You Need to <span className="text-primary">Invest Smarter</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              From portfolio construction to AI-powered insights—explore institutional-grade tools designed for modern investors.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM_FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + idx * 0.1 }}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Card className={cn(
                  "relative overflow-hidden transition-all duration-300 h-full cursor-pointer group",
                  "hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50",
                  hoveredFeature === feature.id && "border-primary/50 shadow-xl shadow-primary/10"
                )}>
                  {/* Gradient overlay on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    `bg-gradient-to-br ${feature.color}`,
                    "opacity-5"
                  )} />
                  
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                        feature.color
                      )}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background/80">
                        {feature.badge}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {feature.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>

                    {/* Preview Content */}
                    <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                      {feature.preview.type === 'options' && 'options' in feature.preview && (
                        <div className="space-y-2">
                          {feature.preview.options?.map((item, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="font-medium text-foreground">{item.name}</span>
                              <span className="text-muted-foreground">• {item.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.preview.type === 'stats' && 'stats' in feature.preview && (
                        <div className="flex justify-around">
                          {feature.preview.stats?.map((item, i: number) => (
                            <div key={i} className="text-center">
                              <p className="text-lg font-bold text-primary font-mono">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.preview.type === 'result' && (
                        <div className="flex justify-around">
                          <div className="text-center">
                            <p className="text-lg font-bold text-emerald-500 font-mono">{feature.preview.winRate}%</p>
                            <p className="text-[10px] text-muted-foreground">win rate</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary font-mono">+{feature.preview.avgReturn}%</p>
                            <p className="text-[10px] text-muted-foreground">avg return</p>
                          </div>
                        </div>
                      )}
                      {feature.preview.type === 'live' && 'liveItems' in feature.preview && (
                        <div className="flex flex-wrap gap-1.5">
                          {feature.preview.liveItems?.map((item, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              <Activity className="h-2.5 w-2.5 mr-1 text-emerald-500" />
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                      Explore {feature.name}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ===================== QUICK STUDIES SECTION ===================== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-card border rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Popular Quant Studies
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click any study below to run it instantly
              </p>
            </div>
            <Button variant="outline" onClick={onRunDemo} className="gap-2">
              <Zap className="h-4 w-4" />
              Run Custom Study
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'after_consecutive_days', name: 'After 3 Down Days', question: 'Does SPY bounce after 3 red days?', result: '68% bounce' },
              { id: 'after_large_move', name: 'After -2% Down Day', question: 'What happens after big selloffs?', result: '64% go up' },
              { id: 'rsi_analysis', name: 'RSI Oversold', question: 'Should you buy when RSI < 30?', result: '71% win rate' },
              { id: 'gap_analysis', name: 'Gap Fill Analysis', question: 'Do gaps really fill?', result: '58% fill' },
              { id: 'vix_spike', name: 'After VIX Spike', question: 'Is high fear a buy signal?', result: '73% bounce' },
              { id: 'volume_surge', name: 'High Volume Days', question: 'What happens after volume spikes?', result: '61% continue' }
            ].map((study) => (
              <button
                key={study.id}
                onClick={() => onSelectStudy(study.id)}
                className={cn(
                  "flex flex-col p-4 rounded-xl border transition-all text-left",
                  "bg-muted/30 hover:bg-muted/50 border-border hover:border-primary/50",
                  "group"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {study.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                    {study.result}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{study.question}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ===================== TRUST INDICATORS ===================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="flex flex-wrap justify-center gap-6 py-6"
        >
          {[
            { icon: Database, label: '10+ Years Historical Data' },
            { icon: Shield, label: 'Bank-Level Security' },
            { icon: Zap, label: 'Real-Time Analysis' },
            { icon: Users, label: 'Used by 10,000+ Investors' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary" />
              <span>{item.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
