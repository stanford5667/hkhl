import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Clock, TrendingUp, ArrowUp, Check, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUsage } from '@/contexts/UsageContext';
import { toast } from 'sonner';
import { PRICING, COMPARISON_FEATURES } from '@/config/pricing';
import { getAffiliateRef } from '@/hooks/useAffiliateTracking';

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
    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-destructive" />
        <span className="text-destructive text-xs font-semibold uppercase tracking-wide">Price increasing soon</span>
      </div>
      <p className="text-muted-foreground text-xs mb-2">
        Lock in today's rate before the price goes up. This offer expires in:
      </p>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-destructive" />
        <span className="font-mono text-sm font-bold text-foreground">
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
    price: PRICING.annualPerMonth,
    billed: `$${PRICING.annualTotal.toLocaleString()}/year`,
    savings: `Save $${PRICING.annualSavings.toLocaleString()}/yr`,
    badge: 'Best Value',
  },
  monthly: {
    label: 'Monthly',
    price: PRICING.monthly,
    billed: `$${PRICING.monthly}/month`,
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
        const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
          body: { billing_interval: selected },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(data?.message || 'Subscription upgraded successfully! You only pay the prorated difference.');
        onOpenChange(false);
        window.location.reload();
      } else {
        const affiliateCode = getAffiliateRef();
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { 
            plan: 'research_education', 
            billing_interval: selected, 
            return_path: returnPath,
            ...(affiliateCode && { affiliate_code: affiliateCode }),
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

  const selectedPrice = PLANS[selected].price;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border px-4 pb-8 pt-6 sm:max-w-lg sm:mx-auto max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="text-center mb-5">
          <SheetTitle className="text-xl text-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isProUpgrade ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm">
            {isProUpgrade 
              ? "Upgrade to Research & Education — you'll only pay the prorated difference"
              : 'Unlock the full Research & Education experience'}
          </SheetDescription>
        </SheetHeader>

        {isProUpgrade && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUp className="w-3.5 h-3.5 text-success" />
              <span className="text-success text-xs font-semibold uppercase tracking-wide">Pro → Research & Education</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Your current Pro subscription will be upgraded. Stripe will automatically prorate the cost — you only pay the difference for the remaining billing period.
            </p>
          </div>
        )}

        {/* Free vs Pro comparison */}
        <div className="mb-5 rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_48px_48px] items-center gap-0 px-3 py-2 bg-muted/50 border-b border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Free</span>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider text-center">Pro</span>
          </div>
          {COMPARISON_FEATURES.map((f, i) => (
            <div
              key={f.name}
              className={cn(
                "grid grid-cols-[1fr_48px_48px] items-center gap-0 px-3 py-1.5",
                f.highlight ? "bg-primary/5" : i % 2 === 0 ? "bg-card" : "bg-muted/30",
                i < COMPARISON_FEATURES.length - 1 && "border-b border-border/50"
              )}
            >
              <span className={cn(
                "text-[11px] leading-tight",
                f.highlight
                  ? "text-foreground font-semibold flex items-center gap-1"
                  : "text-foreground/80"
              )}>
                {f.highlight && <Star className="h-2.5 w-2.5 text-primary fill-primary flex-shrink-0" />}
                {f.name}
              </span>
              <div className="flex justify-center">
                {f.free ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex justify-center">
                <Check className={cn("h-3.5 w-3.5", f.highlight ? "text-primary" : "text-primary")} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {/* Annual */}
          <Card
            className={cn(
              'relative p-4 cursor-pointer border-2 transition-all bg-muted/30',
              selected === 'annual'
                ? 'border-primary ring-1 ring-primary/30'
                : 'border-border hover:border-primary/30'
            )}
            onClick={() => setSelected('annual')}
          >
            {PLANS.annual.badge && (
              <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-semibold px-2">
                {PLANS.annual.badge}
              </Badge>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-semibold text-base">{PLANS.annual.label}</p>
                <p className="text-muted-foreground text-xs">{PLANS.annual.billed}</p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-2xl font-bold">
                  ${PLANS.annual.price}<span className="text-sm text-muted-foreground">/mo</span>
                </p>
                {PLANS.annual.savings && (
                  <p className="text-success text-xs font-medium">{PLANS.annual.savings}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Monthly */}
          <Card
            className={cn(
              'p-4 cursor-pointer border-2 transition-all bg-muted/30',
              selected === 'monthly'
                ? 'border-primary ring-1 ring-primary/30'
                : 'border-border hover:border-primary/30'
            )}
            onClick={() => setSelected('monthly')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-semibold text-base">{PLANS.monthly.label}</p>
                <p className="text-muted-foreground text-xs">{PLANS.monthly.billed}</p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-2xl font-bold">
                  ${PLANS.monthly.price}<span className="text-sm text-muted-foreground">/mo</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
          onClick={handleCheckout}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isProUpgrade ? (
            `Upgrade Now — $${selectedPrice}/mo`
          ) : (
            `Continue — $${selectedPrice}/mo`
          )}
        </Button>

        <PriceIncreaseCountdown />
      </SheetContent>
    </Sheet>
  );
}
