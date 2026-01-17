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
      className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 cursor-pointer transition-all duration-300 hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.01] h-full flex flex-col"
    >
      {/* Subtle hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: 90 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mb-5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all"
        >
          <Plus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.div>

        {/* Text */}
        <h3 className="text-base font-semibold text-foreground mb-1.5 group-hover:text-foreground transition-colors">
          Create New Strategy
        </h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-[220px] leading-relaxed">
          Take the 5-minute assessment to discover your investor DNA
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {[
            { icon: Brain, label: 'AI Analysis' },
            { icon: Zap, label: '5 min' },
            { icon: Sparkles, label: 'Personalized' },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground group-hover:border-border/80 transition-colors"
            >
              <feature.icon className="w-3 h-3" />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-1.5 text-primary font-medium text-sm">
          <span>Start Assessment</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
