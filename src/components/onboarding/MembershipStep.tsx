import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Crown, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const FREE_FEATURES = [
  { name: 'Basic Portfolio Tracking', included: true },
  { name: 'Market Overview Dashboard', included: true },
  { name: 'Up to 3 Saved Portfolios', included: true },
  { name: 'Daily Market Updates', included: true },
  { name: 'AI Market Chat', included: false },
  { name: 'Advanced Analytics', included: false },
  { name: 'Quant Lab Access', included: false },
  { name: 'Real-time Alerts', included: false },
  { name: 'Custom Investment Plans', included: false },
  { name: 'Priority Support', included: false },
];

const PRO_FEATURES = [
  { name: 'Everything in Free', included: true },
  { name: 'Unlimited Portfolios', included: true },
  { name: 'AI-Powered Market Chat', included: true },
  { name: 'Advanced Risk Analytics', included: true },
  { name: 'Quant Lab & Backtesting', included: true },
  { name: 'Real-time Price Alerts', included: true },
  { name: 'Custom Investment Plans', included: true },
  { name: 'Priority Email Support', included: true },
  { name: 'Export Reports (PDF/Excel)', included: true },
  { name: 'Early Access to New Features', included: true },
];

export function MembershipStep({ onComplete, onBack }: MembershipStepProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async (plan: 'free' | 'pro') => {
    if (!user) return;
    
    setSelectedPlan(plan);
    setIsLoading(true);

    try {
      if (plan === 'pro') {
        // Redirect to Stripe checkout for Pro plan
        const { data, error } = await supabase.functions.invoke('create-checkout');
        
        if (error) throw error;
        
        if (data?.url) {
          // Open Stripe checkout in a new tab (iframe restrictions prevent same-tab redirect)
          window.open(data.url, '_blank');
          toast.info('Complete your payment in the new tab. Once done, you\'ll be upgraded automatically.');
          setIsLoading(false);
          return;
        } else {
          throw new Error('No checkout URL returned');
        }
      } else {
        // Free plan - just update profile and complete
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

  return (
    <Card className="bg-slate-900 border-slate-800 max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          Choose Your Plan
        </CardTitle>
        <CardDescription className="text-slate-400">
          Select the plan that works best for you
        </CardDescription>
        <p className="text-xs text-slate-500 mt-2">Step 2 of 2</p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div 
            className={cn(
              "relative rounded-xl border-2 p-6 cursor-pointer transition-all",
              selectedPlan === 'free' 
                ? "border-purple-500 bg-slate-800/50" 
                : "border-slate-700 hover:border-slate-600 bg-slate-800/30"
            )}
            onClick={() => !isLoading && setSelectedPlan('free')}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Free</h3>
              <div className="text-3xl font-bold text-white">$0</div>
              <p className="text-slate-400 text-sm">Forever free</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm",
                    feature.included ? "text-slate-300" : "text-slate-600"
                  )}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full"
              variant={selectedPlan === 'free' ? 'default' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectPlan('free');
              }}
              disabled={isLoading}
            >
              {isLoading && selectedPlan === 'free' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Start Free'
              )}
            </Button>
          </div>

          {/* Pro Plan */}
          <div 
            className={cn(
              "relative rounded-xl border-2 p-6 cursor-pointer transition-all",
              selectedPlan === 'pro' 
                ? "border-purple-500 bg-purple-900/20" 
                : "border-purple-500/50 hover:border-purple-500 bg-gradient-to-b from-purple-900/20 to-slate-800/30"
            )}
            onClick={() => !isLoading && setSelectedPlan('pro')}
          >
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" />
                POPULAR
              </span>
            </div>

            <div className="text-center mb-6 mt-2">
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <div className="text-3xl font-bold text-white">$50<span className="text-lg text-slate-400">/mo</span></div>
              <p className="text-slate-400 text-sm">Billed monthly</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{feature.name}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full bg-purple-600 hover:bg-purple-500"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectPlan('pro');
              }}
              disabled={isLoading}
            >
              {isLoading && selectedPlan === 'pro' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Get Pro'
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            disabled={isLoading}
          >
            ← Back to profile
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
