import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Crown, Check, X, Star, Sparkles, Loader2, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { cn } from '@/lib/utils';
import { PRICING, COMPARISON_FEATURES, COMING_SOON } from '@/config/pricing';
import { getAffiliateRef } from '@/hooks/useAffiliateTracking';

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

const FEATURE_COPY: Record<string, { title: string }> = {
  aiAnalyses: { title: "You've used all your AI analyses today" },
  portfolios: { title: "You've reached the portfolio limit" },
  savedScreens: { title: "You've saved the maximum screens" },
  alertsPerDay: { title: "You've set up all your free alerts" },
  premiumScreens: { title: "This is a Pro feature" },
  quantStudies: { title: "You've used all your free Quant Lab studies" },
  screenerSearches: { title: "Free plan shows limited results" },
  screenerFilters: { title: "Multiple filters are a Pro feature" },
  'strategy-signals': { title: "Unlock Pro Strategy Signals" },
  financialProjections: { title: "Unlock Full Financial Projections" },
  courses: { title: "Unlock All Courses & Education" },
  tradeIdeas: { title: "Unlock Trade Ideas" },
  premiumContent: { title: "Unlock Premium Content" },
  default: { title: "Upgrade to Pro" },
};

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
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
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

export function UpgradeModal({ isOpen, feature, onClose, onUpgrade }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default;
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        setShowAuthSheet(true);
        return;
      }

      const affiliateCode = getAffiliateRef();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: 'research_education', 
          billing_interval: selected,
          ...(affiliateCode && { affiliate_code: affiliateCode }),
        },
      });
      
      if (error) {
        toast.error('Failed to start checkout');
        console.error('Checkout error:', error);
        return;
      }
      
      if (data?.url) {
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
        onUpgrade?.();
        onClose();
      }
    } catch (err) {
      toast.error('Something went wrong');
      console.error('Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    await handleUpgrade();
  };

  const selectedPrice = PLANS[selected].price;

  const UpgradeContent = () => (
    <div className="space-y-4 py-2">
      {/* Feature comparison table */}
      <div className="rounded-lg border border-border overflow-hidden">
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

      {/* Billing interval cards */}
      <div className="space-y-3">
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
        onClick={handleUpgrade}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          `Upgrade Now — $${selectedPrice}/mo`
        )}
      </Button>

      <PriceIncreaseCountdown />

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Coming Soon
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COMING_SOON.map((f, i) => (
            <span key={i} className="text-xs bg-background/50 px-2 py-1 rounded-full text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      </div>

      <Button 
        variant="ghost" 
        onClick={onClose}
        disabled={isLoading}
        className="w-full text-muted-foreground"
      >
        Maybe later
      </Button>

      <p className="text-xs text-muted-foreground text-center pb-2">
        7-day money-back guarantee • Cancel anytime
      </p>
    </div>
  );

  const HeaderIcon = () => (
    <div className="mx-auto mb-4 relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-primary to-primary/70 shadow-primary/30"
      >
        <Crown className="h-7 w-7 text-white" />
      </motion.div>
    </div>
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-b from-background to-muted/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-center pb-2">
              <HeaderIcon />
              <DialogTitle className="text-xl font-bold text-center">
                {copy.title}
              </DialogTitle>
            </DialogHeader>
            <UpgradeContent />
          </DialogContent>
        </Dialog>
        <MobileAuthSheet 
          open={showAuthSheet} 
          onOpenChange={setShowAuthSheet}
          title="Sign up to access premium"
          description="Create a free account, then upgrade to unlock premium features."
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] border-primary/20 bg-gradient-to-b from-background to-muted/30">
          <DrawerHeader className="text-center pb-2">
            <HeaderIcon />
            <DrawerTitle className="text-xl font-bold text-center">
              {copy.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto safe-area-bottom">
            <UpgradeContent />
          </div>
        </DrawerContent>
      </Drawer>
      <MobileAuthSheet 
        open={showAuthSheet} 
        onOpenChange={setShowAuthSheet}
        title="Sign up to access premium"
        description="Create a free account, then upgrade to unlock premium features."
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
