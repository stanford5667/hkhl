import { useState } from 'react';
import { motion, type Easing } from 'framer-motion';
import { Check, X, Crown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PRICING, COMPARISON_FEATURES, COMING_SOON } from '@/config/pricing';
import { cn } from '@/lib/utils';

const ease: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease },
  }),
};

export function LandingPricing() {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<'annual' | 'monthly'>('annual');

  const goSignup = () => navigate('/auth', { state: { mode: 'signup' } });

  return (
    <section id="pricing" className="scroll-mt-20 border-b border-white/[0.04] bg-slate-950 px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mb-8 text-center"
        >
          <h2 className="text-2xl font-bold sm:text-3xl">
            Simple pricing.{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Start free.
            </span>
          </h2>
          <p className="mt-3 text-gray-400">
            Free forever on the basics. Upgrade when you want the full research stack.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
          className="mb-10 flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1">
            {(['annual', 'monthly'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setInterval(opt)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition',
                  interval === opt ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          {interval === 'annual' && (
            <span className="ml-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              Save ${PRICING.annualSavings}/yr
            </span>
          )}
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            custom={2}
            className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="mt-1 text-sm text-gray-400">Explore the market with core data and charts.</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2">
              {COMPARISON_FEATURES.map((f) => (
                <li key={f.name} className="flex items-start gap-2 text-sm">
                  {f.free ? (
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                  )}
                  <span className={f.free ? 'text-gray-200' : 'text-gray-500'}>{f.name}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={goSignup}
              variant="outline"
              className="mt-6 w-full border-slate-700 text-white hover:bg-white/5"
            >
              Get started free
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            custom={3}
            className="relative flex flex-col rounded-xl border border-cyan-500/40 bg-slate-900/60 p-6 shadow-[0_0_40px_hsl(185_80%_50%/0.08)]"
          >
            <span className="absolute -top-3 left-6 rounded-full bg-cyan-400 px-3 py-0.5 text-xs font-bold text-black">
              Most popular
            </span>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-cyan-400" />
              <h3 className="text-lg font-semibold">Pro</h3>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              The full research stack: courses, backtesting, screener and chatroom.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                ${interval === 'annual' ? PRICING.annualPerMonth : PRICING.monthly}
              </span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {interval === 'annual'
                ? `Billed $${PRICING.annualTotal}/year`
                : `Billed $${PRICING.monthly} monthly`}
            </p>
            <ul className="mt-6 flex-1 space-y-2">
              {COMPARISON_FEATURES.map((f) => (
                <li key={f.name} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                  <span className={cn('text-gray-200', f.highlight && 'font-semibold text-white')}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={goSignup}
              className="mt-6 w-full bg-cyan-400 font-semibold text-black hover:bg-cyan-300"
            >
              Get started free
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-[11px] text-gray-500">
              Coming soon (not yet available): {COMING_SOON.join(' · ')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
