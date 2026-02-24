import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Beaker, Brain, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  action: () => void;
  accentClass: string;
}

export function FeatureShowcaseRow() {
  const navigate = useNavigate();

  const features: Feature[] = [
    {
      icon: Beaker,
      title: 'Backtest Strategies',
      description: 'Test any portfolio against historical data with real returns, Sharpe ratios, and drawdown analysis.',
      cta: 'Try backtesting',
      action: () => navigate('/stock/AAPL', { state: { tab: 'backtest' } }),
      accentClass: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Get instant AI-generated insights on fundamentals, technicals, and earnings for any ticker.',
      cta: 'See AI insights',
      action: () => navigate('/stock/NVDA'),
      accentClass: 'text-chart-4 bg-chart-4/10 border-chart-4/20',
    },
    {
      icon: SlidersHorizontal,
      title: 'Stock Screener',
      description: 'Filter 10,000+ stocks by 18+ metrics including P/E, ROE, beta, and growth rates.',
      cta: 'Open screener',
      action: () => {
        const el = document.getElementById('market-intelligence');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
      accentClass: 'text-success bg-success/10 border-success/20',
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        >
          <div
            className={cn(
              "group relative rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5",
              "hover:border-border hover:shadow-md transition-all cursor-pointer"
            )}
            onClick={f.action}
          >
            <div className={cn("inline-flex p-2 rounded-lg border mb-3", f.accentClass)}>
              <f.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mb-3">
              {f.description}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-primary group-hover:gap-1.5 transition-all">
              {f.cta} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
