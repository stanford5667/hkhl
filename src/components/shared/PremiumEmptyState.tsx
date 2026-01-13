import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Sparkles, ArrowRight } from "lucide-react";

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  features?: {
    icon: LucideIcon;
    label: string;
  }[];
  variant?: "default" | "gradient" | "minimal";
}

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  features,
  variant = "gradient",
}: PremiumEmptyStateProps) {
  return (
    <motion.div
      className="min-h-[60vh] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Main card */}
        <motion.div
          className={cn(
            "relative rounded-3xl p-8 sm:p-12 text-center overflow-hidden",
            variant === "gradient" && "bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 shadow-2xl",
            variant === "minimal" && "bg-card/50 border border-border",
            variant === "default" && "bg-card border border-border shadow-lg"
          )}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {/* Decorative gradient ring */}
          {variant === "gradient" && (
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          )}

          {/* Icon */}
          <motion.div
            className="relative mx-auto mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="relative inline-flex">
              {/* Outer ring with animation */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 animate-pulse" style={{ transform: 'scale(1.1)' }} />
              
              {/* Icon container */}
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              
              {/* Sparkle accent */}
              <motion.div
                className="absolute -top-2 -right-2"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                <Sparkles className="h-5 w-5 text-amber-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {title}
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {description}
          </motion.p>

          {/* Features list */}
          {features && features.length > 0 && (
            <motion.div
              className="flex flex-wrap justify-center gap-3 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <feature.icon className="h-3.5 w-3.5 text-primary" />
                  <span>{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                size="lg"
                className="relative group gap-2 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              >
                {primaryAction.icon && <primaryAction.icon className="h-5 w-5" />}
                {primaryAction.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                {secondaryAction.label}
              </Button>
            )}
          </motion.div>
        </motion.div>

        {/* Bottom decorative line */}
        <motion.div
          className="absolute -bottom-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}
