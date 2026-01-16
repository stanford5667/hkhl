/**
 * Fortune 500 Style Create Plan Card
 * Animated call-to-action card
 */

import { motion } from 'framer-motion';
import { Plus, Brain, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatePlanCardProps {
  onClick: () => void;
}

export function CreatePlanCard({ onClick }: CreatePlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-gradient-to-br from-white/5 to-transparent cursor-pointer transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02] min-h-[280px]"
    >
      {/* Animated background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow effect */}
      <div className="absolute -inset-px bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />

      <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 90 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-6 group-hover:border-purple-500/30 transition-colors"
        >
          <Plus className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
        </motion.div>

        {/* Text */}
        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-white transition-colors">
          Create New Strategy
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
          Take the 5-minute assessment to discover your investor DNA
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[
            { icon: Brain, label: 'AI Analysis' },
            { icon: Zap, label: '5 min' },
            { icon: Sparkles, label: 'Personalized' },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground group-hover:border-white/20 transition-colors"
            >
              <feature.icon className="w-3.5 h-3.5" />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
          <span className="text-sm font-medium">Start Assessment</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
