import { motion, type Easing } from 'framer-motion';
import { Zap, Database, GraduationCap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';

const ease: Easing = [0.16, 1, 0.3, 1];

const features = [
  {
    icon: Zap,
    iconColor: 'text-[hsl(185_80%_55%)]',
    glowBg: 'bg-[hsl(185_80%_50%/0.1)]',
    borderColor: 'border-[hsl(185_80%_50%/0.2)]',
    title: 'Lightning-Fast Backtesting',
    text: 'Validate your edge across decades of market history in seconds.',
  },
  {
    icon: Database,
    iconColor: 'text-[hsl(270_70%_65%)]',
    glowBg: 'bg-[hsl(270_70%_55%/0.1)]',
    borderColor: 'border-[hsl(270_70%_55%/0.2)]',
    title: 'Institutional-Grade Data',
    text: 'Real-time SEC filings, fundamentals, and earnings — no Bloomberg required.',
  },
  {
    icon: GraduationCap,
    iconColor: 'text-[hsl(40_90%_60%)]',
    glowBg: 'bg-[hsl(40_90%_55%/0.1)]',
    borderColor: 'border-[hsl(40_90%_55%/0.2)]',
    title: 'Learn from the Pros',
    text: '90+ lesson masterclass from a Private Equity investor.',
  },
];

const statItems = [
  { number: '10,000+', label: 'Equities & ETFs' },
  { number: '30+', label: 'Years of Data' },
  { number: 'Real-Time', label: 'SEC Filings' },
];

export function ResearchMarketingSection() {
  const { user } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

  // Don't render for authenticated users
  if (user) return null;

  return (
    <>
      <section className="relative overflow-hidden bg-[#050911]">
        {/* Top fade from hero */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#050911] to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
          {/* Section label */}
          <motion.div
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-white/20">
              Why investors choose us
            </span>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-16 sm:mb-20">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${f.glowBg} border ${f.borderColor} mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon className={`w-4.5 h-4.5 ${f.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats Row */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14 py-10 sm:py-12 border-y border-white/[0.06]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            {statItems.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-mono">{s.number}</div>
                <div className="text-[10px] sm:text-xs text-white/25 mt-1.5 font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Final CTA */}
          <motion.div
            className="text-center pt-14 sm:pt-18 pb-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              Start free. Scale when you're ready.
            </p>
            <p className="text-xs sm:text-sm text-white/25 mb-8 max-w-sm mx-auto font-mono">
              No credit card required. Full access to backtesting, screening, and AI analysis.
            </p>
            <Button
              onClick={() => requireAuth(() => {}, 'signup')}
              size="xl"
              className="bg-[hsl(185_80%_50%)] hover:bg-[hsl(185_80%_55%)] text-black font-semibold shadow-[0_0_40px_hsl(185_80%_50%/0.3)] hover:shadow-[0_0_60px_hsl(185_80%_50%/0.45)] transition-all duration-300 text-sm sm:text-base px-10 sm:px-14 group"
            >
              Start Building for Free
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </div>

        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      <AuthGateDialog open={showAuthDialog} onOpenChange={closeAuthDialog} />
    </>
  );
}
