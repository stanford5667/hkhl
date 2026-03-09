import { motion, type Easing } from 'framer-motion';
import { Zap, Database, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';

const features = [
  {
    icon: Zap,
    iconColor: 'text-cyan-400',
    glowColor: 'shadow-[0_0_20px_hsl(185_80%_50%/0.3)]',
    title: 'Lightning-Fast Backtesting.',
    text: 'Validate your edge with high-fidelity backtests across decades of market history in seconds.',
  },
  {
    icon: Database,
    iconColor: 'text-purple-400',
    glowColor: 'shadow-[0_0_20px_hsl(270_70%_55%/0.3)]',
    title: 'Institutional Data.',
    text: 'Access clean, real-time SEC filings, fundamental models, and earnings estimates without the Bloomberg price tag.',
  },
  {
    icon: GraduationCap,
    iconColor: 'text-amber-400',
    glowColor: 'shadow-[0_0_20px_hsl(38_90%_55%/0.3)]',
    title: 'Learn from the Pros.',
    text: 'Master portfolio management with our 90+ lesson masterclass led by a Private Equity investor.',
  },
];

const statItems = [
  { number: '10,000+', label: 'Equities & ETFs' },
  { number: '30+', label: 'Years of History' },
  { number: 'Real-Time', label: 'SEC Filings' },
];

const ease: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease },
  }),
};

export function MarketingLandingPage() {
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

  return (
    <>
      {/* Marketing Transition */}
      <section className="w-full bg-[#0B0E14] py-24 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight"
          >
            Institutional quant infrastructure,{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              redesigned for everyday investors.
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto"
          >
            Stop paying Wall Street prices for Wall Street tools. Build, test, and deploy
            quantitative strategies — all from your browser.
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-8 max-w-7xl mx-auto mt-20">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.05]"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.05] ${f.glowColor} mb-6`}>
                <f.icon className={`w-6 h-6 ${f.iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scale & Trust Banner */}
      <section className="w-full bg-[#0B0E14] border-t border-b border-transparent" style={{
        borderImage: 'linear-gradient(90deg, hsl(185 80% 50% / 0.3), hsl(270 70% 55% / 0.3)) 1',
      }}>
        <div className="flex flex-col sm:flex-row justify-around items-center py-12 sm:py-16 max-w-6xl mx-auto gap-10 sm:gap-4 px-4">
          {statItems.map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl font-bold text-white">{s.number}</div>
              <div className="text-sm sm:text-base text-gray-400 mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-[#0B0E14] py-28 sm:py-36 px-4">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug"
          >
            Built for every trader.{' '}
            <span className="text-gray-400 font-normal">
              Start free and scale when you&apos;re ready.
            </span>
          </motion.p>
          <motion.div variants={fadeUp} custom={1} className="mt-10">
            <Button
              onClick={() => requireAuth()}
              size="xl"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_30px_hsl(185_80%_50%/0.4)] hover:shadow-[0_0_40px_hsl(185_80%_50%/0.5)] transition-all duration-300 text-base px-12"
            >
              Start Building for Free
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <AuthGateDialog open={showAuthDialog} onOpenChange={closeAuthDialog} />
    </>
  );
}
