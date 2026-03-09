/**
 * Fortune 500 Style Strategy Explorer Hero
 * Premium glassmorphism design with animated elements
 */

import { motion } from 'framer-motion';
import { Brain, Sparkles, ChevronRight, Shield, Rocket, Compass, Flame, Eye, Anchor, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StrategyExplorerHeroProps {
  onStartAssessment: () => void;
  hasPlans?: boolean;
}

const ARCHETYPES = [
  { name: 'Guardian', icon: Shield, color: 'from-blue-500 to-cyan-400', spirit: '🛡️' },
  { name: 'Navigator', icon: Eye, color: 'from-violet-500 to-purple-400', spirit: '🧭' },
  { name: 'Architect', icon: Compass, color: 'from-emerald-500 to-teal-400', spirit: '🏗️' },
  { name: 'Trailblazer', icon: Rocket, color: 'from-amber-500 to-orange-400', spirit: '🚀' },
  { name: 'Maverick', icon: Flame, color: 'from-rose-500 to-pink-400', spirit: '🔥' },
  { name: 'Sentinel', icon: Anchor, color: 'from-cyan-500 to-blue-400', spirit: '⚓' },
];

export function StrategyExplorerHero({ onStartAssessment, hasPlans }: StrategyExplorerHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-white/10">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-conic from-purple-500/10 via-transparent to-blue-500/10 rounded-full blur-2xl opacity-50" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-purple-300 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Investment Analysis
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              <span className="text-white">Build AI Investment</span>
              <br />
              <span className="text-white">Strategies in Minutes.</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                No Coding Required.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-white/60 mb-8 leading-relaxed"
            >
              Our proprietary assessment analyzes your risk tolerance, decision-making style, and investment preferences to create a personalized strategy blueprint.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                onClick={onStartAssessment}
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-6 text-lg rounded-xl shadow-2xl shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Start Assessment
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              </Button>
              
              <div className="flex items-center gap-3 text-white/50">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">5 min</span>
                </div>
                <span className="text-white/20">•</span>
                <span className="text-sm">16 investor types</span>
              </div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-6"
            >
              {[
                { label: 'Personalized', value: 'AI-Powered' },
                { label: 'Framework', value: 'Research-Based' },
                { label: 'Analysis', value: 'Comprehensive' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-xl font-bold text-white">{item.value}</span>
                  <span className="text-xs text-white/40 uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Archetype showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block relative"
          >
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Central orb */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  <Brain className="w-12 h-12 text-white/80" />
                </div>
              </div>

              {/* Orbiting archetypes */}
              {ARCHETYPES.map((archetype, i) => {
                const angle = (i * 360) / ARCHETYPES.length;
                const radius = 140;
                const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
                const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;

                return (
                  <motion.div
                    key={archetype.name}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -8, 0],
                      }}
                      transition={{
                        duration: 3,
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={cn(
                        "group relative w-20 h-20 rounded-2xl bg-gradient-to-br backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-xl",
                        archetype.color
                      )}
                    >
                      <span className="text-2xl mb-1">{archetype.spirit}</span>
                      <span className="text-[10px] font-medium text-white/90">{archetype.name}</span>
                      
                      {/* Tooltip */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <span className="text-xs text-white/60 bg-black/50 px-2 py-1 rounded-full">
                          The {archetype.name}
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}

              {/* Connecting lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
                <circle
                  cx="200"
                  cy="200"
                  r="140"
                  fill="none"
                  stroke="url(#orbitGradient)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-30"
                />
                <defs>
                  <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
