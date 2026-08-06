import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessagesSquare, ArrowRight, Crown, Pin, TrendingUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoCard, DemoCardHeader, SampleBadge } from './DemoCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TickerBadge } from '@/components/ui/TickerBadge';

interface DemoMessage {
  id: string;
  name: string;
  initials: string;
  isAdmin: boolean;
  time: string;
  content: React.ReactNode;
  isPinned?: boolean;
  reactions?: { emoji: string; count: number }[];
  replies?: number;
}

const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: '1',
    name: 'Chris Stanford',
    initials: 'CS',
    isAdmin: true,
    time: 'Today, 9:42 AM',
    content: (
      <>
        <span className="text-emerald-400 font-semibold">LONG IDEA: </span>
        <TickerBadge ticker="PLTR" className="mx-0.5" /> looking constructive above $43.50. Volume profile is
        clean and the break above last week’s high has follow-through. Initial target $48.
      </>
    ),
    isPinned: true,
    reactions: [
      { emoji: '🚀', count: 12 },
      { emoji: '💎', count: 5 },
    ],
    replies: 8,
  },
  {
    id: '2',
    name: 'Alex Rivera',
    initials: 'AR',
    isAdmin: false,
    time: 'Today, 9:47 AM',
    content: (
      <>
        Anyone watching <TickerBadge ticker="SOFI" className="mx-0.5" />? Broke the descending wedge on the
        daily with earnings next week. Feels like a risk/reward long if it holds $17.80.
      </>
    ),
    reactions: [{ emoji: '👍', count: 7 }],
    replies: 3,
  },
  {
    id: '3',
    name: 'Chris Stanford',
    initials: 'CS',
    isAdmin: true,
    time: 'Today, 10:05 AM',
    content: (
      <>
        <span className="text-amber-400 font-semibold">UPDATE: </span>
        Trimming half the <TickerBadge ticker="NVDA" className="mx-0.5" /> position here into $129. The setup
        still works, but it’s overextended and we’re booking risk. Stops raised to breakeven.
      </>
    ),
    reactions: [
      { emoji: '📈', count: 9 },
      { emoji: '🔥', count: 4 },
    ],
    replies: 11,
  },
];

function MessageRow({ message, index }: { message: DemoMessage; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className={cn(
        'group flex gap-3 px-3 py-2.5 rounded-xl',
        message.isPinned && 'bg-amber-500/5 border border-amber-500/15',
        !message.isPinned && 'bg-slate-900/40 border border-slate-800/50',
        'hover:bg-slate-900/60 transition-colors'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback
            className={cn(
              'text-[10px] font-bold',
              message.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-slate-800 text-slate-300'
            )}
          >
            {message.initials}
          </AvatarFallback>
        </Avatar>
        {message.isAdmin && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary ring-2 ring-slate-950">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold', message.isAdmin ? 'text-primary' : 'text-foreground')}>
            {message.name}
          </span>
          {message.isAdmin && (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">
              ANALYST
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{message.time}</span>
          {message.isPinned && (
            <span className="inline-flex items-center gap-1 text-[9px] text-amber-500">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
        </div>

        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-words">
          {message.content}
        </div>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {message.reactions?.map((r) => (
            <span
              key={r.emoji}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-300"
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </span>
          ))}
          {message.replies && message.replies > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer">
              <MessageSquare className="h-3 w-3" />
              {message.replies} {message.replies === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatroomDemo() {
  const navigate = useNavigate();

  return (
    <DemoCard className="overflow-hidden">
      <div className="flex flex-col gap-3">
        <DemoCardHeader
          icon={<MessagesSquare className="h-4 w-4 text-cyan-400" />}
          category="Live Trade Ideas"
          title="Research Chatroom"
          subtitle="Live rooms, analyst setups & community discussion"
          right={<SampleBadge label="Preview" />}
        />

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            247 online now
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-cyan-400" />
            8 trade ideas posted today
          </span>
        </div>

        {/* Chat preview feed */}
        <div className="flex flex-col gap-2 mt-1">
          {DEMO_MESSAGES.map((message, i) => (
            <MessageRow key={message.id} message={message} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/community')}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-[11px] font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99]"
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            Join the chatroom
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
            className="flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/15"
          >
            <Crown className="h-3.5 w-3.5" />
            Unlock live trade ideas — Pro required
          </button>
        </div>
      </div>
    </DemoCard>
  );
}
