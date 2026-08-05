import { motion, type Easing } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PRICING, COMPARISON_FEATURES } from '@/config/pricing';

const ease: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease },
  }),
};

const freeFeatures = COMPARISON_FEATURES.filter((f) => f.free).map((f) => f.name);
const proOnlyFeatures = COMPARISON_FEATURES.filter((f) => !f.free).map((f) => f.name);

export function LandingFAQ() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "What's included in the free plan?",
      a: <>Free accounts get {freeFeatures.join(', ')}.</>,
    },
    {
      q: 'What does Pro cost?',
      a: (
        <>
          Pro is ${PRICING.annualPerMonth}/mo billed annually (${PRICING.annualTotal}/year), or $
          {PRICING.monthly}/mo billed monthly — the annual plan saves ${PRICING.annualSavings} a year.
          Pro adds {proOnlyFeatures.join(', ')}.
        </>
      ),
    },
    {
      q: 'Do I need to know how to code to backtest?',
      a: (
        <>
          No. Backtesting runs with no coding required — pick a ticker and one of 8 built-in
          strategies, or build your own rules in the Strategy Builder with 20+ indicators.
        </>
      ),
    },
    {
      q: 'What data do you use and how far back does it go?',
      a: (
        <>
          Backtests run across 30+ years of historical market data covering 10,000+ stocks and ETFs,
          alongside live pricing, charts, trending tickers and the earnings calendar.
        </>
      ),
    },
    {
      q: 'How many lessons are in the Academy?',
      a: (
        <>
          The Academy includes 90+ video lessons across structured modules, from investing
          fundamentals through portfolio construction, risk management and advanced strategies. Free
          accounts can watch timed previews; Pro unlocks the full library.
        </>
      ),
    },
    {
      q: 'Is this financial advice?',
      a: (
        <>
          No. Asset Labs AI is an educational and research platform and does not provide
          personalized financial, investment or legal advice. See our{' '}
          <Link to="/disclosures" className="text-cyan-400 underline hover:text-cyan-300">
            disclosures
          </Link>{' '}
          and{' '}
          <Link to="/terms" className="text-cyan-400 underline hover:text-cyan-300">
            terms
          </Link>{' '}
          for details.
        </>
      ),
    },
    {
      q: 'Can I manage or cancel my subscription?',
      a: (
        <>
          Yes. Once you're subscribed, Settings → Billing opens a secure billing portal where you can
          cancel, update your payment method or change your plan.
        </>
      ),
    },
  ];

  return (
    <section id="faq" className="scroll-mt-20 border-b border-white/[0.04] bg-slate-950 px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mb-8 text-center text-2xl font-bold sm:text-3xl"
        >
          Frequently asked{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            questions
          </span>
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          custom={1}
        >
          <Accordion type="single" collapsible className="rounded-xl border border-slate-800 bg-slate-900/60 px-4">
            {items.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-slate-800">
                <AccordionTrigger className="text-left text-sm font-semibold text-white hover:no-underline sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-gray-400">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
