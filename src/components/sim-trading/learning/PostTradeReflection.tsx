/**
 * Post-Trade Reflection Dialog
 * Prompts users after closing a position to reflect on their decision
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Brain, ThumbsUp, ThumbsDown, Lightbulb, BookOpen } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  tradeId: string;
  ticker: string;
  action: string;
  pnl?: number | null;
  pnlPct?: number | null;
}

const EMOTION_OPTIONS = [
  { value: 'confident', label: 'Confident', emoji: '😎' },
  { value: 'nervous', label: 'Nervous', emoji: '😰' },
  { value: 'fomo', label: 'FOMO', emoji: '🏃' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'disciplined', label: 'Disciplined', emoji: '🎯' },
  { value: 'impulsive', label: 'Impulsive', emoji: '⚡' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'relieved', label: 'Relieved', emoji: '😮‍💨' },
];

const REFLECTION_PROMPTS = {
  win: [
    'What specifically went right with this trade?',
    'Was this outcome due to your analysis or market conditions?',
    'How would you size this trade differently next time?',
  ],
  loss: [
    'What signal did you miss before entering this trade?',
    'Did you follow your exit rules or hold too long?',
    'What would you do differently with this information?',
  ],
  sell: [
    'Why did you decide to exit now instead of holding longer?',
    'Did this trade align with your portfolio goals?',
    'What did this trade teach you about your risk tolerance?',
  ],
};

export function PostTradeReflection({ open, onOpenChange, portfolioId, tradeId, ticker, action, pnl, pnlPct }: Props) {
  const { user } = useAuth();
  const [thesis, setThesis] = useState('');
  const [emotion, setEmotion] = useState('');
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);
  const [lesson, setLesson] = useState('');
  const [saving, setSaving] = useState(false);

  const isWin = pnl !== null && pnl !== undefined && pnl > 0;
  const promptCategory = action === 'sell' ? (isWin ? 'win' : 'loss') : 'sell';
  const prompts = REFLECTION_PROMPTS[promptCategory];

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('sim_trade_reflections' as any).insert({
      user_id: user.id,
      portfolio_id: portfolioId,
      trade_id: tradeId,
      ticker: ticker.toUpperCase(),
      action,
      thesis,
      emotion,
      would_repeat: wouldRepeat,
      lesson_learned: lesson,
    });

    if (error) {
      toast.error('Failed to save reflection');
    } else {
      toast.success('Reflection saved — learning from every trade! 📖');
    }
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Trade Reflection — {ticker.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trade outcome summary */}
          <div className={`rounded-lg p-3 border ${isWin ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {action === 'sell' ? 'Position Closed' : 'Trade Executed'}: {ticker.toUpperCase()}
              </span>
              {pnl !== null && pnl !== undefined && (
                <span className={`text-sm font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isWin ? '+' : ''}{pnlPct?.toFixed(1)}% (${pnl.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Guided prompt */}
          <div className="rounded bg-muted/40 border border-border/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Reflection Prompt</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {prompts[Math.floor(Math.random() * prompts.length)]}
            </p>
          </div>

          {/* Thesis */}
          <div className="space-y-1.5">
            <Label className="text-xs">What was your thesis for this trade?</Label>
            <Textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="e.g., Expected earnings beat based on sector momentum..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Emotion */}
          <div className="space-y-1.5">
            <Label className="text-xs">What emotion drove this decision?</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTION_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={emotion === opt.value ? 'default' : 'outline'}
                  className={`cursor-pointer text-[10px] transition-all ${emotion === opt.value ? 'ring-1 ring-primary' : 'hover:bg-muted'}`}
                  onClick={() => setEmotion(opt.value)}
                >
                  {opt.emoji} {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Would repeat */}
          <div className="space-y-1.5">
            <Label className="text-xs">Would you take this trade again?</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={wouldRepeat === true ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => setWouldRepeat(true)}
              >
                <ThumbsUp className="h-3 w-3 mr-1" /> Yes — good process
              </Button>
              <Button
                size="sm"
                variant={wouldRepeat === false ? 'destructive' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => setWouldRepeat(false)}
              >
                <ThumbsDown className="h-3 w-3 mr-1" /> No — flawed process
              </Button>
            </div>
          </div>

          {/* Lesson */}
          <div className="space-y-1.5">
            <Label className="text-xs">Key lesson learned</Label>
            <Textarea
              value={lesson}
              onChange={e => setLesson(e.target.value)}
              placeholder="e.g., I need to set stop losses before entering trades..."
              className="text-xs min-h-[50px]"
            />
          </div>

          {/* Educational callout */}
          <div className="rounded bg-primary/5 border border-primary/20 p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Why Reflect?</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Top traders review every trade — winners AND losers. Studies show that traders who journal
              improve returns by 30-50% over 12 months by eliminating repeated mistakes and doubling down
              on what works.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
              Skip for now
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Reflection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
