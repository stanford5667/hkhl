/**
 * Fortune 500 Style Investor Type Showcase
 * Interactive cards with hover effects and premium aesthetics
 */

import { motion } from 'framer-motion';
import { Shield, Anchor, Compass, Eye, Rocket, Flame, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const INVESTOR_TYPES = [
  {
    name: 'The Guardian',
    code: 'GAPD',
    icon: Shield,
    color: 'blue',
    gradient: 'from-blue-600 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    borderColor: 'border-blue-500/30',
    spirit: '🛡️',
    tagline: 'Protector of Wealth',
    description: 'Prioritizes capital preservation with steady, predictable returns.',
    traits: ['Risk-averse', 'Patient', 'Disciplined'],
    riskRange: '0-20',
  },
  {
    name: 'The Sentinel',
    code: 'GIPD',
    icon: Anchor,
    color: 'cyan',
    gradient: 'from-cyan-600 to-teal-500',
    bgGradient: 'from-cyan-500/10 to-teal-500/10',
    borderColor: 'border-cyan-500/30',
    spirit: '⚓',
    tagline: 'Steady & Strategic',
    description: 'Believes in measured progress with calculated risk.',
    traits: ['Cautious', 'Research-driven', 'Systematic'],
    riskRange: '20-35',
  },
  {
    name: 'The Architect',
    code: 'GAPD',
    icon: Compass,
    color: 'emerald',
    gradient: 'from-emerald-600 to-green-500',
    bgGradient: 'from-emerald-500/10 to-green-500/10',
    borderColor: 'border-emerald-500/30',
    spirit: '🏗️',
    tagline: 'Builder of Portfolios',
    description: 'Engineering the perfect balance through diversification.',
    traits: ['Analytical', 'Detail-oriented', 'Balanced'],
    riskRange: '35-50',
  },
  {
    name: 'The Navigator',
    code: 'PIAD',
    icon: Eye,
    color: 'violet',
    gradient: 'from-violet-600 to-purple-500',
    bgGradient: 'from-violet-500/10 to-purple-500/10',
    borderColor: 'border-violet-500/30',
    spirit: '🧭',
    tagline: 'Adaptive & Opportunistic',
    description: 'Blends strategy with flexibility for tactical opportunities.',
    traits: ['Adaptable', 'Forward-thinking', 'Curious'],
    riskRange: '50-65',
  },
  {
    name: 'The Trailblazer',
    code: 'PIAC',
    icon: Rocket,
    color: 'amber',
    gradient: 'from-amber-600 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    spirit: '🚀',
    tagline: 'Growth-Focused Pioneer',
    description: 'Pursues growth with high conviction and bold moves.',
    traits: ['Ambitious', 'Confident', 'Visionary'],
    riskRange: '65-80',
  },
  {
    name: 'The Maverick',
    code: 'PIAC',
    icon: Flame,
    color: 'rose',
    gradient: 'from-rose-600 to-pink-500',
    bgGradient: 'from-rose-500/10 to-pink-500/10',
    borderColor: 'border-rose-500/30',
    spirit: '🔥',
    tagline: 'Bold & Unconventional',
    description: 'Thrives on high-stakes opportunities for outsized returns.',
    traits: ['Bold', 'Independent', 'Contrarian'],
    riskRange: '80-100',
  },
];

interface InvestorTypeShowcaseProps {
  onSelectType?: (type: string) => void;
}

export function InvestorTypeShowcase({ onSelectType }: InvestorTypeShowcaseProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Investor Archetypes</h2>
          <p className="text-muted-foreground">Discover which profile matches your investment style</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="w-4 h-4 text-amber-400" />
          <span>6 Distinct Profiles</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INVESTOR_TYPES.map((type, index) => (
          <motion.div
            key={type.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onClick={() => onSelectType?.(type.name)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
              type.bgGradient,
              type.borderColor,
              "hover:border-white/30"
            )}
          >
            {/* Glow effect on hover */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl",
              `bg-gradient-to-br ${type.gradient}`
            )} style={{ opacity: 0.1 }} />

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg",
                    type.gradient
                  )}>
                    {type.spirit}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{type.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{type.code}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Tagline */}
              <p className={cn(
                "text-sm font-medium mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                type.gradient
              )}>
                {type.tagline}
              </p>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {type.description}
              </p>

              {/* Traits */}
              <div className="flex flex-wrap gap-2 mb-4">
                {type.traits.map((trait, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-white/70"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* Risk Range */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs text-muted-foreground">Risk Score Range</span>
                <span className="text-sm font-mono font-medium text-foreground">{type.riskRange}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
