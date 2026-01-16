/**
 * Fortune 500 Style Learn Section
 * Educational content with premium card design
 */

import { motion } from 'framer-motion';
import {
  Shield, PieChart, Brain, TrendingUp, BookOpen, Target,
  ArrowRight, Lightbulb, ChevronRight, GraduationCap, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LEARN_CARDS = [
  {
    id: 'risk',
    title: 'Understanding Risk',
    description: 'Learn about risk tolerance vs. risk capacity, and how they affect your investment strategy.',
    icon: Shield,
    gradient: 'from-blue-600 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/5',
    borderColor: 'border-blue-500/20',
    points: [
      'Risk tolerance: emotional comfort',
      'Risk capacity: financial ability',
      'Time horizon affects both',
    ],
  },
  {
    id: 'allocation',
    title: 'Asset Allocation',
    description: 'How dividing your portfolio across different asset classes reduces risk.',
    icon: PieChart,
    gradient: 'from-emerald-600 to-teal-500',
    bgGradient: 'from-emerald-500/10 to-teal-500/5',
    borderColor: 'border-emerald-500/20',
    points: [
      'Stocks: Growth potential',
      'Bonds: Stability & income',
      'Alternatives: Diversification',
    ],
  },
  {
    id: 'personality',
    title: 'Investor Personality',
    description: 'Discover your investor DNA - the 16 types based on 4 key dimensions.',
    icon: Brain,
    gradient: 'from-purple-600 to-violet-500',
    bgGradient: 'from-purple-500/10 to-violet-500/5',
    borderColor: 'border-purple-500/20',
    points: [
      'Risk: Guardian vs Pioneer',
      'Decision: Analytical vs Intuitive',
      'Time: Patient vs Active',
    ],
  },
  {
    id: 'compound',
    title: 'Compound Growth',
    description: 'Why starting early and staying consistent creates exponential wealth.',
    icon: TrendingUp,
    gradient: 'from-amber-600 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/5',
    borderColor: 'border-amber-500/20',
    points: [
      'Time is your greatest asset',
      'Reinvesting accelerates growth',
      'Consistency beats timing',
    ],
  },
  {
    id: 'diversification',
    title: 'Diversification',
    description: 'Why putting all eggs in one basket is risky for long-term wealth building.',
    icon: BarChart3,
    gradient: 'from-cyan-600 to-blue-500',
    bgGradient: 'from-cyan-500/10 to-blue-500/5',
    borderColor: 'border-cyan-500/20',
    points: [
      'Reduce single-point failure',
      'Balance risk and return',
      'Geographic diversification',
    ],
  },
  {
    id: 'goals',
    title: 'Goal-Based Investing',
    description: 'Aligning your investments with specific life goals and timelines.',
    icon: Target,
    gradient: 'from-rose-600 to-pink-500',
    bgGradient: 'from-rose-500/10 to-pink-500/5',
    borderColor: 'border-rose-500/20',
    points: [
      'Define clear objectives',
      'Match risk to timeline',
      'Regular progress reviews',
    ],
  },
];

interface LearnSectionProps {
  onCardClick?: (id: string) => void;
}

export function LearnSection({ onCardClick }: LearnSectionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Investment Academy</h2>
            <p className="text-muted-foreground">Master the fundamentals of smart investing</p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {LEARN_CARDS.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onClick={() => onCardClick?.(card.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-gradient-to-br cursor-pointer transition-all duration-300",
              "hover:shadow-xl hover:scale-[1.02] hover:border-white/30",
              card.bgGradient,
              card.borderColor
            )}
          >
            {/* Hover glow */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl",
              `bg-gradient-to-br ${card.gradient}`
            )} style={{ opacity: 0.08 }} />

            <div className="relative p-6">
              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                card.gradient
              )}>
                <card.icon className="w-6 h-6 text-white" />
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{card.description}</p>

              {/* Points */}
              <ul className="space-y-2 mb-4">
                {card.points.map((point, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full bg-gradient-to-r",
                      card.gradient
                    )} />
                    {point}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-white transition-colors">
                <Lightbulb className="w-4 h-4" />
                <span>Learn More</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
