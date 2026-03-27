import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ChevronRight, GraduationCap, Clock, Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction-v2.jpg';
import modRiskImg from '@/assets/modules/mod-risk-management.jpg';
import modOptsImg from '@/assets/modules/mod-options-derivatives.jpg';
import modMacroImg from '@/assets/modules/mod-macro-economics.jpg';
import modAdvImg from '@/assets/modules/mod-advanced-strategies.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const THUMBNAIL_MAP: Record<string, string> = {
  'intro': modIntroImg, 'fundamental': modFundImg, 'technical': modTechImg,
  'portfolio': modPortImg, 'risk': modRiskImg, 'option': modOptsImg, 'derivative': modOptsImg,
  'macro': modMacroImg, 'advanced': modAdvImg, 'strateg': modAdvImg,
};

const DESC_MAP: Record<string, string> = {
  'intro': 'Start your journey with the building blocks: how markets work, asset classes, and order types.',
  'fundamental': 'Dissect real 10-K filings to evaluate revenue growth, profit margins, and free cash flow.',
  'technical': 'Read candlestick charts like a pro. Identify breakouts and combine RSI, MACD, and Bollinger Bands.',
  'portfolio': 'Apply Modern Portfolio Theory to build an efficient frontier and diversify.',
  'risk': 'Master position sizing, stop-loss strategies, hedging, and drawdown management.',
  'option': 'Master the Greeks, covered calls, protective puts, and vertical spreads.',
  'derivative': 'Master the Greeks, covered calls, protective puts, and vertical spreads.',
  'macro': 'Connect Fed policy, yield curves, CPI prints, and global trade flows to market cycles.',
  'advanced': 'Factor investing, pairs trading, and systematic mean-reversion models.',
  'strateg': 'Factor investing, pairs trading, and systematic mean-reversion models.',
};

function enrichModule(title: string, type: 'thumbnail' | 'description'): string | null {
  const lower = title.toLowerCase();
  const map = type === 'thumbnail' ? THUMBNAIL_MAP : DESC_MAP;
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

const FALLBACK_MODULES = [
  { id: '1', title: 'Introduction to Investing', description: 'Start your journey with the building blocks: how markets work, asset classes, and order types.', orderIndex: 1, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modIntroImg, lessonCount: 8, totalDuration: 2400, gradient: 'from-cyan-600 to-blue-700' },
  { id: '2', title: 'Fundamental Analysis', description: 'Dissect real 10-K filings to evaluate revenue growth, profit margins, and free cash flow.', orderIndex: 2, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modFundImg, lessonCount: 12, totalDuration: 4200, gradient: 'from-violet-600 to-purple-800' },
  { id: '3', title: 'Technical Analysis', description: 'Read candlestick charts like a pro. Identify breakouts and combine RSI, MACD, and Bollinger Bands.', orderIndex: 3, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modTechImg, lessonCount: 15, totalDuration: 5400, gradient: 'from-amber-500 to-orange-700' },
  { id: '4', title: 'Portfolio Construction', description: 'Apply Modern Portfolio Theory to build an efficient frontier and diversify.', orderIndex: 4, courseTitle: 'Masterclass', courseId: null, thumbnailUrl: modPortImg, lessonCount: 10, totalDuration: 3600, gradient: 'from-emerald-600 to-teal-800' },
];

const CHAT_MESSAGES = [
  { name: 'Alex M.', avatar: 'bg-gradient-to-br from-cyan-400 to-blue-500', time: '2:34 PM', msg: 'Just loaded up on NVDA calls ahead of earnings. The AI sentiment score on here is showing 87% bullish 🚀', status: 'online' as const },
  { name: 'Sarah K.', avatar: 'bg-gradient-to-br from-violet-400 to-purple-500', time: '2:35 PM', msg: 'Be careful with IV crush post-earnings. I ran a backtest on the volatility breakout strategy — historically it drops 8% in the first week after.', status: 'online' as const },
  { name: 'Mike R.', avatar: 'bg-gradient-to-br from-emerald-400 to-teal-500', time: '2:36 PM', msg: 'The macro module on yield curves was 🔥. Finally understanding why the 2s10s spread matters for tech valuations.', status: 'idle' as const },
  { name: 'Jessica L.', avatar: 'bg-gradient-to-br from-amber-400 to-orange-500', time: '2:37 PM', msg: 'Anyone else seeing the divergence on AAPL RSI? Looks like a textbook oversold bounce setup from Module 3.', status: 'online' as const, reactions: [{ emoji: '👀', count: 4 }, { emoji: '📈', count: 2 }] },
];

export function ResearchCommunityPreview() {
  const navigate = useNavigate();

  const { data: modules } = useQuery({
    queryKey: ['research-academy-modules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_modules')
        .select(`id, title, description, order_index,
          course:courses!inner(id, title, is_published, thumbnail_url),
          lessons:course_lessons(id, title, description, video_duration)`)
        .eq('courses.is_published', true)
        .order('order_index', { ascending: true })
        .limit(4);
      return (data || []).map((m: any) => ({
        id: m.id, title: m.title,
        description: (m.description && m.description.length > 10 ? m.description : null) || enrichModule(m.title, 'description') || 'Explore key concepts and practical techniques.',
        orderIndex: m.order_index, courseTitle: m.course?.title, courseId: m.course?.id,
        thumbnailUrl: enrichModule(m.title, 'thumbnail') || m.course?.thumbnail_url,
        lessonCount: m.lessons?.length ?? 0,
        totalDuration: (m.lessons || []).reduce((sum: number, l: any) => sum + (l.video_duration || 0), 0),
        gradient: ['from-cyan-600 to-blue-700', 'from-violet-600 to-purple-800', 'from-amber-500 to-orange-700', 'from-emerald-600 to-teal-800'][m.order_index % 4],
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const displayModules = modules && modules.length > 0 ? modules : FALLBACK_MODULES;

  return (
    <>
      {/* ─── Chat Room Preview ─── */}
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

      {/* ─── Academy Preview ─── */}
      <motion.section className="space-y-3" variants={fadeUp}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-semibold text-foreground uppercase tracking-wide">Academy</h2>
              <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground hidden sm:block">90+ lessons from fundamentals to advanced strategy</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/academy')}
            className="hidden sm:inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.6)] text-[11px] px-5 py-2.5"
          >
            Browse curriculum <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {displayModules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(mod.courseId ? `/academy/course/${mod.courseId}` : '/academy')}
              className="group cursor-pointer rounded-xl border border-border bg-card/60 overflow-hidden transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
            >
              <div className={cn("relative h-28 w-full bg-gradient-to-br flex items-center justify-center overflow-hidden", mod.gradient)}>
                {mod.thumbnailUrl ? (
                  <img src={mod.thumbnailUrl} alt={mod.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-sm">{mod.orderIndex}</div>
                      <span className="text-[10px] uppercase tracking-widest text-white/70 font-medium">Module {mod.orderIndex}</span>
                    </div>
                  </>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/80">
                  <Clock className="h-2.5 w-2.5" />
                  {mod.totalDuration >= 3600
                    ? `${Math.floor(mod.totalDuration / 3600)}h ${Math.round((mod.totalDuration % 3600) / 60)}m`
                    : `${Math.round(mod.totalDuration / 60)}m`}
                </div>
              </div>

              <div className="p-3 space-y-2">
                <h3 className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">{mod.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{mod.description}</p>
                <div className="flex items-center justify-between pt-1.5 border-t border-border">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Video className="h-3 w-3" />
                    {mod.lessonCount} lessons
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">
                    Explore →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </>
  );
}
