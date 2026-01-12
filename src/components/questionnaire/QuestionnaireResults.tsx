/**
 * UNIFIED QUESTIONNAIRE RESULTS SHELL
 * 
 * Consistent results presentation across all questionnaires:
 * - Investment Plan results
 * - Portfolio Builder results
 * 
 * Features:
 * - Header with user info and actions
 * - Tabbed navigation
 * - Investor archetype/profile card
 * - Mobile-optimized layout
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  RefreshCw,
  LogOut,
  Play,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTOR ARCHETYPES (Shared across all results)
// ═══════════════════════════════════════════════════════════════════════════════

export const INVESTOR_ARCHETYPES = {
  'The Guardian': {
    range: [0, 20],
    color: 'blue',
    tagline: 'Protector of Wealth',
    description: 'You prioritize security above all else. Your investment philosophy centers on capital preservation and steady, predictable returns.',
    traits: ['Risk-averse', 'Patient', 'Disciplined', 'Methodical'],
    strengths: ['Emotional stability during downturns', 'Consistent saving habits', 'Long-term thinking'],
    blindSpots: ['May miss growth opportunities', 'Inflation erosion risk', 'Over-concentration in "safe" assets'],
    famousInvestor: 'Benjamin Graham',
    spirit: '🛡️',
  },
  'The Sentinel': {
    range: [20, 35],
    color: 'cyan',
    tagline: 'Steady & Strategic',
    description: 'You believe in measured progress. Security matters, but you understand that some growth is necessary to meet long-term goals.',
    traits: ['Cautious optimist', 'Research-driven', 'Values stability', 'Systematic'],
    strengths: ['Balanced decision-making', 'Thorough due diligence', 'Resistant to FOMO'],
    blindSpots: ['Analysis paralysis', 'Slow to act on opportunities', 'May be too conservative for timeline'],
    famousInvestor: 'John Bogle',
    spirit: '⚓',
  },
  'The Architect': {
    range: [35, 50],
    color: 'emerald',
    tagline: 'Builder of Balanced Portfolios',
    description: 'You see investing as engineering the perfect system. Balance and diversification are your guiding principles.',
    traits: ['Analytical', 'Systematic', 'Detail-oriented', 'Balanced'],
    strengths: ['Excellent at diversification', 'Data-driven decisions', 'Consistent rebalancing'],
    blindSpots: ['May over-complicate', 'Could miss concentrated bets', 'Tendency to over-optimize'],
    famousInvestor: 'Ray Dalio',
    spirit: '🏗️',
  },
  'The Navigator': {
    range: [50, 65],
    color: 'violet',
    tagline: 'Adaptive & Opportunistic',
    description: 'You blend strategy with flexibility. You have a plan but adapt when compelling opportunities arise.',
    traits: ['Adaptable', 'Opportunistic', 'Forward-thinking', 'Curious'],
    strengths: ['Spotting market trends', 'Tactical adjustments', 'Open to new ideas'],
    blindSpots: ['May overtrade', 'Chasing performance', 'Information overload'],
    famousInvestor: 'Peter Lynch',
    spirit: '🧭',
  },
  'The Trailblazer': {
    range: [65, 80],
    color: 'amber',
    tagline: 'Growth-Focused Pioneer',
    description: 'You believe in the power of growth and are willing to endure volatility for potentially superior returns.',
    traits: ['Ambitious', 'Confident', 'Action-oriented', 'Visionary'],
    strengths: ['High conviction investing', 'Early trend adoption', 'Strong risk tolerance'],
    blindSpots: ['Overconfidence', 'Concentrated positions', 'May ignore warning signs'],
    famousInvestor: 'Cathie Wood',
    spirit: '🚀',
  },
  'The Maverick': {
    range: [80, 100],
    color: 'rose',
    tagline: 'Bold & Unconventional',
    description: 'You thrive on high-stakes opportunities. You understand that outsized returns require outsized risks.',
    traits: ['Bold', 'Independent', 'Contrarian', 'High-energy'],
    strengths: ['Exceptional upside capture', 'Thrives under pressure', 'Strong conviction'],
    blindSpots: ['Excessive risk-taking', 'Emotional decisions', 'Portfolio concentration'],
    famousInvestor: 'Michael Burry',
    spirit: '🔥',
  },
};

export function getArchetype(riskScore: number) {
  for (const [name, archetype] of Object.entries(INVESTOR_ARCHETYPES)) {
    if (riskScore >= archetype.range[0] && riskScore < archetype.range[1]) {
      return { name, ...archetype };
    }
  }
  return { name: 'The Maverick', ...INVESTOR_ARCHETYPES['The Maverick'] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface ResultsHeaderProps {
  userName?: string;
  title?: string;
  subtitle?: string;
  onExport?: () => void;
  onShare?: () => void;
  onStartNew?: () => void;
  onSignOut?: () => void;
  onDemo?: () => void;
}

export function ResultsHeader({
  userName,
  title,
  subtitle,
  onExport,
  onShare,
  onStartNew,
  onSignOut,
  onDemo,
}: ResultsHeaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">
                {title || `${userName}'s Investment Strategy`}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {subtitle || `Generated ${new Date().toLocaleDateString()}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {onShare && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyLink}
                className="hidden sm:flex"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
            )}
            {onExport && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onExport}
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            {onStartNew && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onStartNew}
              >
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New</span>
              </Button>
            )}
            {onDemo && (
              <Button 
                size="sm"
                onClick={onDemo}
                className="bg-gradient-to-r from-primary to-emerald-500"
              >
                <Play className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Demo</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHETYPE HERO CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface ArchetypeHeroProps {
  riskScore: number;
  investorTypeCode?: string;
  children?: React.ReactNode; // For additional stats
}

export function ArchetypeHero({ riskScore, investorTypeCode, children }: ArchetypeHeroProps) {
  const archetype = getArchetype(riskScore);
  
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-900/40",
    cyan: "from-cyan-500/20 to-cyan-900/40",
    emerald: "from-emerald-500/20 to-emerald-900/40",
    violet: "from-violet-500/20 to-violet-900/40",
    amber: "from-amber-500/20 to-amber-900/40",
    rose: "from-rose-500/20 to-rose-900/40",
  };

  const iconBgClasses = {
    blue: "bg-blue-500/30",
    cyan: "bg-cyan-500/30",
    emerald: "bg-emerald-500/30",
    violet: "bg-violet-500/30",
    amber: "bg-amber-500/30",
    rose: "bg-rose-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 p-6 sm:p-8",
        "bg-gradient-to-br",
        colorClasses[archetype.color as keyof typeof colorClasses]
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        </div>

        <div className="relative grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Left: Archetype Info */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl",
                iconBgClasses[archetype.color as keyof typeof iconBgClasses]
              )}>
                {archetype.spirit}
              </div>
              <div>
                <Badge className="mb-1 bg-white/10 text-foreground/80 border-0 text-xs">
                  Your Investor Type
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold">{archetype.name}</h2>
              </div>
            </div>

            <p className="text-base sm:text-lg text-foreground/60 mb-3">{archetype.tagline}</p>
            <p className="text-sm text-foreground/70 mb-4">{archetype.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {archetype.traits.map((trait, i) => (
                <Badge key={i} variant="outline" className="border-foreground/20 text-foreground/70 text-xs">
                  {trait}
                </Badge>
              ))}
            </div>

            <div className="text-sm text-foreground/50">
              <span className="text-foreground/70">Famous investor:</span>{' '}
              <span className="font-medium text-foreground/90">{archetype.famousInvestor}</span>
            </div>
          </div>

          {/* Right: Custom Content (Stats, etc) */}
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK GAUGE
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskGauge({ score, size = 'md', showLabel = true }: RiskGaugeProps) {
  // Responsive sizing - smaller on mobile
  const getResponsiveRadius = () => {
    if (size === 'sm') return { mobile: 35, desktop: 40 };
    if (size === 'md') return { mobile: 50, desktop: 60 };
    return { mobile: 60, desktop: 80 };
  };
  
  const sizes = getResponsiveRadius();
  const strokeWidth = size === 'sm' ? 5 : size === 'md' ? 7 : 9;
  
  // Use desktop sizes for calculations, CSS will handle responsive
  const radius = sizes.desktop;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const getColor = () => {
    if (score < 30) return '#10b981'; // emerald
    if (score < 50) return '#f59e0b'; // amber
    if (score < 70) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getLabel = () => {
    if (score < 30) return 'Conservative';
    if (score < 50) return 'Moderate';
    if (score < 70) return 'Growth';
    return 'Aggressive';
  };

  const svgSize = (radius + strokeWidth) * 2;
  const mobileScale = sizes.mobile / sizes.desktop;

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative transform scale-[var(--mobile-scale)] sm:scale-100 origin-center" 
        style={{ 
          width: svgSize, 
          height: svgSize,
          '--mobile-scale': mobileScale 
        } as React.CSSProperties}
      >
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "font-bold",
              size === 'sm' && "text-lg sm:text-xl",
              size === 'md' && "text-2xl sm:text-3xl",
              size === 'lg' && "text-3xl sm:text-4xl"
            )}
          >
            {score}
          </motion.span>
          {showLabel && size !== 'sm' && (
            <span className="text-[10px] sm:text-xs text-muted-foreground">Risk Score</span>
          )}
        </div>
      </div>
      {showLabel && (
        <Badge
          className="mt-1.5 sm:mt-2 text-xs"
          style={{ backgroundColor: `${getColor()}20`, color: getColor() }}
        >
          {getLabel()}
        </Badge>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS GRID
// ═══════════════════════════════════════════════════════════════════════════════

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, columns = 2 }: StatsGridProps) {
  return (
    <div className={cn(
      "grid gap-3 sm:gap-4",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-2 sm:grid-cols-4"
    )}>
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card/50 rounded-xl p-3 sm:p-4 border border-border/50"
        >
          <div className="flex items-center gap-2 mb-1">
            {stat.icon}
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
