import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, Brain, PieChart, BarChart3, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SpotlightItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
}

const SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    id: 'investor-dna',
    title: 'Discover Your Investor DNA',
    description: 'Take a 5-min assessment to find your investor personality type',
    icon: Brain,
    href: '/investment-plan',
    color: 'from-purple-500 to-pink-500',
    badge: 'Start Here',
  },
  {
    id: 'portfolio-builder',
    title: 'Build Your Portfolio',
    description: 'Create an optimized portfolio with AI guidance',
    icon: PieChart,
    href: '/portfolio-visualizer',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'market-intel',
    title: 'Market Intelligence',
    description: 'Track macro trends, commodities, and currencies',
    icon: BarChart3,
    href: '/market-intel',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'portfolio-tracker',
    title: 'Track Your Portfolio',
    description: 'Monitor performance and get AI insights',
    icon: Briefcase,
    href: '/',
    color: 'from-orange-500 to-amber-500',
  },
];

interface FeatureSpotlightProps {
  show: boolean;
  onDismiss: () => void;
}

export function FeatureSpotlight({ show, onDismiss }: FeatureSpotlightProps) {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-50"
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
            <div>
              <h3 className="font-semibold text-sm">Get Started</h3>
              <p className="text-xs text-muted-foreground">Explore what you can do</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Items */}
          <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
            {SPOTLIGHT_ITEMS.map((item, idx) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  navigate(item.href);
                  onDismiss();
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  "hover:bg-secondary/50 group"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                  item.color
                )}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    {item.badge && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
