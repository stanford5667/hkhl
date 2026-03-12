import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Loader2, Sparkles, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING, COMPARISON_FEATURES, COMING_SOON } from '@/config/pricing';

interface MembershipStepProps {
  onComplete: () => void;
  onBack: () => void;
  isStandalone?: boolean;
}

type PlanType = 'free' | 'research_education';

export function MembershipStep({ onComplete, onBack, isStandalone = false }: MembershipStepProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'annual' | 'monthly'>('annual');

  const handleSelectPlan = async (plan: PlanType) => {
    if (!user) return;
    
    setSelectedPlan(plan);
    setIsLoading(true);

    try {
      if (plan === 'research_education') {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error('Your session has expired. Please sign in again.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan: 'research_education', billing_interval: selectedInterval },
        });
        
        if (error) throw error;
        
        if (data?.url) {
          window.location.href = data.url;
          setIsLoading(false);
          return;
        } else {
          throw new Error('No checkout URL returned');
        }
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            membership_tier: 'free',
            onboarding_step: 'complete',
            onboarding_completed: true,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('Account created! Upgrade anytime to unlock more features.');
        onComplete();
      }
    } catch (error) {
      console.error('Error processing plan selection:', error);
      toast.error('Failed to process your selection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPrice = selectedInterval === 'annual' ? PRICING.annualPerMonth : PRICING.monthly;

  return (
    <Card className="glass-card max-w-5xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {isStandalone ? 'Upgrade to Pro' : 'Choose Your Plan'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isStandalone ? 'Unlock all premium features' : 'Select the plan that works best for you'}
        </CardDescription>
        {!isStandalone && <p className="text-xs text-muted-foreground/70 mt-2">Step 2 of 2</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feature comparison table */}
        <div className="max-w-md mx-auto rounded-lg border border-border overflow-hidden">
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
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex justify-center">
                <Check className={cn("h-3.5 w-3.5", f.highlight ? "text-amber-400" : "text-amber-400")} />
              </div>
            </div>
          ))}
        </div>

        {/* Billing interval cards */}
        <div className="max-w-md mx-auto space-y-3">
          <Card
            className={cn(
              'relative p-4 cursor-pointer border-2 transition-all bg-muted/30',
              selectedInterval === 'annual'
                ? 'border-amber-500 ring-1 ring-amber-500/30'
                : 'border-border hover:border-primary/30'
            )}
            onClick={() => setSelectedInterval('annual')}
          >
            <Badge className="absolute -top-2.5 left-4 bg-amber-600 text-white text-[10px] font-semibold px-2">
              Best Value
            </Badge>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-semibold text-base">Annual</p>
                <p className="text-muted-foreground text-xs">${PRICING.annualTotal.toLocaleString()}/year</p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-2xl font-bold">
                  ${PRICING.annualPerMonth}<span className="text-sm text-muted-foreground">/mo</span>
                </p>
                <p className="text-green-400 text-xs font-medium">Save ${PRICING.annualSavings.toLocaleString()}/yr</p>
              </div>
            </div>
          </Card>

          <Card
            className={cn(
              'p-4 cursor-pointer border-2 transition-all bg-muted/30',
              selectedInterval === 'monthly'
                ? 'border-amber-500 ring-1 ring-amber-500/30'
                : 'border-border hover:border-primary/30'
            )}
            onClick={() => setSelectedInterval('monthly')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-semibold text-base">Monthly</p>
                <p className="text-muted-foreground text-xs">${PRICING.monthly}/month</p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-2xl font-bold">
                  ${PRICING.monthly}<span className="text-sm text-muted-foreground">/mo</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="max-w-md mx-auto space-y-3">
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold h-12 text-base"
            onClick={() => handleSelectPlan('research_education')}
            disabled={isLoading}
          >
            {isLoading && selectedPlan === 'research_education' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Upgrade Now — $${selectedPrice}/mo`
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSelectPlan('free')}
            disabled={isLoading}
          >
            {isLoading && selectedPlan === 'free' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Continue with Free'
            )}
          </Button>
        </div>

        {/* Coming Soon */}
        <div className="max-w-md mx-auto bg-gradient-to-r from-primary/10 to-amber-500/10 rounded-lg p-3 border border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </p>
          <div className="flex flex-wrap gap-1">
            {COMING_SOON.map((feature, i) => (
              <span key={i} className="text-xs bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            {isStandalone ? '← Back' : '← Back to profile'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
