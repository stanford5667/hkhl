import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const CHAT_MESSAGES = [
  { name: 'Alex M.', avatar: 'bg-gradient-to-br from-cyan-400 to-blue-500', time: '2:34 PM', msg: 'Just loaded up on NVDA calls ahead of earnings. The AI sentiment score on here is showing 87% bullish 🚀', status: 'online' as const },
  { name: 'Sarah K.', avatar: 'bg-gradient-to-br from-violet-400 to-purple-500', time: '2:35 PM', msg: 'Be careful with IV crush post-earnings. I ran a backtest on the volatility breakout strategy — historically it drops 8% in the first week after.', status: 'online' as const },
  { name: 'Mike R.', avatar: 'bg-gradient-to-br from-emerald-400 to-teal-500', time: '2:36 PM', msg: 'The macro module on yield curves was 🔥. Finally understanding why the 2s10s spread matters for tech valuations.', status: 'idle' as const },
  { name: 'Jessica L.', avatar: 'bg-gradient-to-br from-amber-400 to-orange-500', time: '2:37 PM', msg: 'Anyone else seeing the divergence on AAPL RSI? Looks like a textbook oversold bounce setup from Module 3.', status: 'online' as const, reactions: [{ emoji: '👀', count: 4 }, { emoji: '📈', count: 2 }] },
];

export function ResearchCommunityPreview() {
  const navigate = useNavigate();

  return (
    <>
      <motion.section className="space-y-3" variants={fadeUp}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 border border-primary/20">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-semibold text-foreground uppercase tracking-wide">Live Chat Room</h2>
              <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground hidden sm:block">Real traders sharing setups and spotting opportunities</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/community')}
            className="hidden sm:inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.6)] text-[11px] px-5 py-2.5"
          >
            Join chat <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          onClick={() => navigate('/community')}
          className="cursor-pointer rounded-xl border border-border bg-card/60 overflow-hidden shadow-lg transition-all hover:border-primary/30"
        >
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary text-sm">💬</div>
              <div>
                <div className="text-sm font-semibold text-foreground"># general</div>
                <div className="text-[10px] text-muted-foreground">🔥 47 trade ideas shared today · 32 online</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={cn("h-6 w-6 rounded-full border-2 border-background -ml-2 first:ml-0", [
                  "bg-gradient-to-br from-cyan-400 to-blue-500",
                  "bg-gradient-to-br from-violet-400 to-purple-500",
                  "bg-gradient-to-br from-amber-400 to-orange-500",
                  "bg-gradient-to-br from-emerald-400 to-teal-500",
                  "bg-gradient-to-br from-rose-400 to-pink-500",
                ][i])} />
              ))}
              <span className="ml-2 text-[10px] text-muted-foreground">+27</span>
            </div>
          </div>

          {/* Chat messages */}
          <div className="p-4 space-y-4">
            {CHAT_MESSAGES.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
                className="flex gap-3"
              >
                <div className="relative shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white", m.avatar)}>
                    {m.name.charAt(0)}
                  </div>
                  <div className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card", m.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">{m.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{m.msg}</p>
                  {m.reactions && (
                    <div className="flex gap-1.5 mt-1.5">
                      {m.reactions.map((r, ri) => (
                        <span key={ri} className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                          {r.emoji} {r.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex gap-0.5">
                {[0, 1, 2].map(d => (
                  <motion.div
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </div>
              <span>3 people are typing…</span>
            </div>
          </div>

          {/* Chat input mock */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
              <span className="text-sm text-muted-foreground flex-1">Message #general...</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-base">😀</span>
                <span className="text-base">📎</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </>
  );
}
