import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, SlidersHorizontal, FlaskConical, type LucideIcon } from 'lucide-react';
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

function FeatureCard({ feature: f, compact = false }: { feature: Feature; compact?: boolean }) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card/60 backdrop-blur-sm",
        compact ? "p-4" : "p-5 sm:p-7",
        "border-border/40 hover:border-primary/30",
        "hover:shadow-[0_0_24px_hsl(var(--primary)/0.06)]",
        "transition-all cursor-pointer"
      )}
      onClick={f.action}
    >
      <div className={cn("inline-flex rounded-lg border", compact ? "p-1.5 mb-2.5" : "p-2 mb-4", f.accentClass)}>
        <f.icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <h3 className={cn("font-semibold font-mono text-foreground mb-1.5", compact ? "text-xs" : "text-sm sm:text-base")}>{f.title}</h3>
      <p className={cn("text-foreground/70 leading-relaxed", compact ? "text-[10px] mb-3 line-clamp-2" : "text-[11px] sm:text-xs mb-4")}>
        {f.description}
      </p>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all",
          "bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)]",
          "shadow-[0_0_16px_hsl(175_80%_45%/0.35)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.55)]",
          compact ? "text-[10px] px-3.5 py-2" : "text-[11px] sm:text-xs px-5 py-2.5"
        )}
      >
        {f.cta} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export function FeatureShowcaseRow() {
  const navigate = useNavigate();

  const features: Feature[] = [
    {
      icon: FlaskConical,
      title: 'No-Code AI Investing',
      description: 'Backtest strategies, run Monte Carlo simulations, and analyze risk — no programming required.',
      cta: 'Try it free',
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
    <section>
      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <FeatureCard feature={f} />
          </motion.div>
        ))}
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="sm:hidden -mx-3 px-3">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="snap-start shrink-0 w-[72vw] max-w-[260px]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <FeatureCard feature={f} compact />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
