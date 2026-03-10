import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: 'research_education',
          billing_interval: selected,
          return_path: returnPath,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-slate-900 border-slate-700 px-4 pb-8 pt-6 sm:max-w-lg sm:mx-auto">
        <SheetHeader className="text-center mb-5">
          <SheetTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Choose Your Plan
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-sm">
            Unlock the full Research & Education experience
          </SheetDescription>
        </SheetHeader>

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
          ) : (
            `Continue — $${selected === 'annual' ? '58' : '100'}/mo`
          )}
        </Button>

        <PriceIncreaseCountdown />
      </SheetContent>
    </Sheet>
  );
}
