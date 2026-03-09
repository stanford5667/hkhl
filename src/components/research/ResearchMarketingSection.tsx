import { motion, type Easing } from 'framer-motion';
import { Zap, Database, GraduationCap, ArrowDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';

const ease: Easing = [0.16, 1, 0.3, 1];

const features = [
  {
    icon: Zap,
    iconColor: 'text-cyan-400',
    glowBg: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    title: 'Lightning-Fast Backtesting',
    text: 'Validate your edge across decades of market history in seconds.',
  },
  {
    icon: Database,
    iconColor: 'text-purple-400',
    glowBg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    title: 'Institutional-Grade Data',
    text: 'Real-time SEC filings, fundamentals, and earnings — no Bloomberg required.',
  },
  {
    icon: GraduationCap,
    iconColor: 'text-amber-400',
    glowBg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
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
      {/* ──── VISUAL BREAK: Gradient divider ──── */}
      <div className="relative w-full h-px my-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-sm" />
      </div>

      {/* ──── HERO IMPACT SECTION ──── */}
      <section className="relative overflow-hidden bg-[#060910] py-20 sm:py-28">
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(185 80% 50% / 0.08) 0%, transparent 60%)' }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(270 70% 55% / 0.06) 0%, transparent 60%)' }}
            animate={{ x: [0, -30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          />
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/20"
          animate={{ opacity: [0.2, 0.5, 0.2], y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[9px] uppercase tracking-[0.3em] font-mono">Discover</span>
          <ArrowDown className="h-3.5 w-3.5" />
        </motion.div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          {/* Massive headline */}
          <motion.div
            className="text-center mb-16 sm:mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease }}
          >
            <motion.div
              className="inline-block mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-[11px] font-mono uppercase tracking-[0.2em]"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease }}
            >
              Why 1,000+ investors chose us
            </motion.div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              <span className="text-white">Institutional quant</span>
              <br />
              <span className="text-white">infrastructure, </span>
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_4s_ease-in-out_infinite]">
                redesigned
              </span>
              <br />
              <span className="text-white/40">for everyday investors.</span>
            </h2>

            <motion.p
              className="mt-6 sm:mt-8 text-base sm:text-lg text-white/40 max-w-xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease }}
            >
              Stop paying Wall Street prices for Wall Street tools. Build, test, and deploy
              quantitative strategies — all from your browser.
            </motion.p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-20">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${f.glowBg} border ${f.borderColor} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats Row */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 py-10 sm:py-14 border-y border-white/[0.06]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            {statItems.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-5xl font-bold text-white tracking-tight">{s.number}</div>
                <div className="text-xs sm:text-sm text-white/30 mt-1.5 font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Final CTA */}
          <motion.div
            className="text-center pt-16 sm:pt-20 pb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
              Start free. Scale when you're ready.
            </p>
            <p className="text-sm text-white/30 mb-8 max-w-md mx-auto">
              No credit card required. Full access to backtesting, screening, and AI analysis.
            </p>
            <Button
              onClick={() => requireAuth(() => {}, 'signup')}
              size="xl"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_40px_hsl(185_80%_50%/0.35)] hover:shadow-[0_0_60px_hsl(185_80%_50%/0.5)] transition-all duration-300 text-sm sm:text-base px-10 sm:px-14 group"
            >
              Start Building for Free
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </div>
      </section>

      <AuthGateDialog open={showAuthDialog} onOpenChange={closeAuthDialog} />
    </>
  );
}
