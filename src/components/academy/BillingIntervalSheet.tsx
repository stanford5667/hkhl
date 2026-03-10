import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Loader2, Clock, TrendingUp, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUsage } from '@/contexts/UsageContext';
import { toast } from 'sonner';

function PriceIncreaseCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const getDeadline = () => {
      const stored = localStorage.getItem('price_increase_deadline');
      if (stored) return new Date(stored);
      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      localStorage.setItem('price_increase_deadline', deadline.toISOString());
      return deadline;
    };

    const deadline = getDeadline();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, deadline.getTime() - now);
      setTimeLeft({
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-rose-300 text-xs font-semibold uppercase tracking-wide">Price increasing soon</span>
      </div>
      <p className="text-slate-300 text-xs mb-2">
        Lock in today's rate before the price goes up. This offer expires in:
      </p>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-mono text-sm font-bold text-white">
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}

interface BillingIntervalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
}

const PLANS = {
  annual: {
    label: 'Annual',
    price: 58,
    billed: '$700/year',
    savings: 'Save $500/yr',
    badge: 'Best Value',
  },
  monthly: {
    label: 'Monthly',
    price: 100,
    billed: '$100/month',
    savings: null,
    badge: null,
  },
};

export function BillingIntervalSheet({ open, onOpenChange, returnPath }: BillingIntervalSheetProps) {
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const { plan } = useUsage();
  
  const isProUpgrade = plan === 'pro';

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      if (isProUpgrade) {
        // Use upgrade function with proration
        const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
          body: { billing_interval: selected },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(data?.message || 'Subscription upgraded successfully! You only pay the prorated difference.');
        onOpenChange(false);
        // Refresh subscription status
        window.location.reload();
      } else {
        // New subscription checkout
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            plan: 'research_education',
            billing_interval: selected,
            return_path: returnPath,
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank') || (window.location.href = data.url);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-slate-900 border-slate-700 px-4 pb-8 pt-6 sm:max-w-lg sm:mx-auto">
        <SheetHeader className="text-center mb-5">
          <SheetTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            {isProUpgrade ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-sm">
            {isProUpgrade 
              ? "Upgrade to Research & Education — you'll only pay the prorated difference"
              : 'Unlock the full Research & Education experience'}
          </SheetDescription>
        </SheetHeader>

        {isProUpgrade && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-semibold uppercase tracking-wide">Pro → Research & Education</span>
            </div>
            <p className="text-slate-300 text-xs">
              Your current Pro subscription will be upgraded. Stripe will automatically prorate the cost — you only pay the difference for the remaining billing period.
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {/* Annual */}
          <Card
            className={cn(
              'relative p-4 cursor-pointer border-2 transition-all bg-slate-800/50',
              selected === 'annual'
                ? 'border-amber-500 ring-1 ring-amber-500/30'
                : 'border-slate-700 hover:border-slate-600'
            )}
            onClick={() => setSelected('annual')}
          >
            {PLANS.annual.badge && (
              <Badge className="absolute -top-2.5 left-4 bg-amber-600 text-white text-[10px] font-semibold px-2">
                {PLANS.annual.badge}
              </Badge>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-base">{PLANS.annual.label}</p>
                <p className="text-slate-400 text-xs">{PLANS.annual.billed}</p>
              </div>
              <div className="text-right">
                <p className="text-white text-2xl font-bold">
                  ${PLANS.annual.price}<span className="text-sm text-slate-400">/mo</span>
                </p>
                {PLANS.annual.savings && (
                  <p className="text-green-400 text-xs font-medium">{PLANS.annual.savings}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Monthly */}
          <Card
            className={cn(
              'p-4 cursor-pointer border-2 transition-all bg-slate-800/50',
              selected === 'monthly'
                ? 'border-amber-500 ring-1 ring-amber-500/30'
                : 'border-slate-700 hover:border-slate-600'
            )}
            onClick={() => setSelected('monthly')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-base">{PLANS.monthly.label}</p>
                <p className="text-slate-400 text-xs">{PLANS.monthly.billed}</p>
              </div>
              <div className="text-right">
                <p className="text-white text-2xl font-bold">
                  ${PLANS.monthly.price}<span className="text-sm text-slate-400">/mo</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Features summary */}
        <div className="space-y-2 mb-6">
          {['Full video course library', 'Trade ideas & community chat', 'AI backtester & 30+ yrs data', 'Cancel anytime'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold h-12 text-base"
          onClick={handleCheckout}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isProUpgrade ? (
            `Upgrade Now — $${selected === 'annual' ? '58' : '100'}/mo`
          ) : (
            `Continue — $${selected === 'annual' ? '58' : '100'}/mo`
          )}
        </Button>

        <PriceIncreaseCountdown />
      </SheetContent>
    </Sheet>
  );
}
