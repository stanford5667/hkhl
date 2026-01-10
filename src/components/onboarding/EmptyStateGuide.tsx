import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LucideIcon, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateGuideProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  features?: string[];
  gradient?: string;
}

export function EmptyStateGuide({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  features,
  gradient = 'from-primary to-purple-600',
}: EmptyStateGuideProps) {
  const navigate = useNavigate();

  const handleAction = (action?: { href?: string; onClick?: () => void }) => {
    if (action?.onClick) {
      action.onClick();
    } else if (action?.href) {
      navigate(action.href);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* Icon */}
      <div className={cn(
        "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-6",
        gradient
      )}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        {description}
      </p>

      {/* Features */}
      {features && features.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {features.map((feature, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 text-xs bg-secondary/50 px-3 py-1.5 rounded-full"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              {feature}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {primaryAction && (
          <Button
            onClick={() => handleAction(primaryAction)}
            className={cn("gap-2 bg-gradient-to-r hover:opacity-90", gradient)}
          >
            {primaryAction.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={() => handleAction(secondaryAction)}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
