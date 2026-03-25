import { motion } from 'framer-motion';
import { Globe, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketThemes } from '@/hooks/useMarketThemes';
import { MARKET_THEMES as FALLBACK_THEMES } from '@/data/marketThemes';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

interface Props {
  openTeaser: () => void;
}

export function LandingMarketThemes({ openTeaser }: Props) {
  const { data: dbThemes, isLoading } = useMarketThemes();
  const themes = (dbThemes && dbThemes.length > 0 ? dbThemes : FALLBACK_THEMES).slice(0, 6);

  return (
    <section className="border-b border-white/[0.06] bg-slate-900/30 py-14 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-8">
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-1">
            <Globe className="h-5 w-5 text-purple-400" />
            <h2 className="text-2xl font-bold sm:text-3xl text-white">Major Market Themes</h2>
          </motion.div>
          <motion.p variants={fadeUp} custom={1} className="text-gray-400 text-sm">
            AI-curated macro themes driving markets today — sentiment, impact scores, and related tickers.
          </motion.p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme, i) => {
            const Icon = theme.icon;
            const sentiment = theme.sentimentScore;
            const sentimentLabel = sentiment >= 0.6 ? 'Bullish' : sentiment <= 0.4 ? 'Bearish' : 'Neutral';
            const sentimentColor = sentiment >= 0.6 ? 'text-emerald-400' : sentiment <= 0.4 ? 'text-rose-400' : 'text-amber-400';
            const sentimentBg = sentiment >= 0.6 ? 'bg-emerald-500/10 border-emerald-500/20' : sentiment <= 0.4 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20';

            return (
              <motion.div
                key={theme.id}
                variants={fadeUp}
                custom={i % 3}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                onClick={openTeaser}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:border-purple-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Icon className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-tight">{theme.title}</h3>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{theme.category}</span>
                    </div>
                  </div>
                  <div className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", sentimentBg, sentimentColor)}>
                    {sentimentLabel}
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{theme.summary}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      theme.impactPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {theme.impactPercent >= 0 ? '+' : ''}{theme.impactPercent.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-gray-600">impact</span>
                  </div>
                  <div className="flex gap-1">
                    {theme.tickers.slice(0, 3).map((t) => (
                      <span key={t.symbol} className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                        {t.symbol}
                      </span>
                    ))}
                    {theme.tickers.length > 3 && (
                      <span className="text-[10px] text-gray-600 self-center">+{theme.tickers.length - 3}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={openTeaser}
            className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10 hover:text-white"
          >
            Explore All Themes
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
