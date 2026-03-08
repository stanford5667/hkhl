import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Crown, GraduationCap, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const FREE_FEATURES = [
  { name: 'Basic Portfolio Tracking', included: true },
  { name: 'Market Overview Dashboard', included: true },
  { name: '2 Basic Quant Lab Studies', included: true },
  { name: 'Limited Screener Results', included: true },
  { name: 'Save Portfolios & Studies', included: false },
  { name: 'Full Quant Lab Access', included: false },
  { name: 'Unlimited Screener', included: false },
  { name: 'Extended Timeframes', included: false },
];

const PRO_FEATURES = [
  { name: 'Everything in Free', included: true },
  { name: 'Save Portfolios, Studies & Screens', included: true, highlight: true },
  { name: '100+ Quant Lab Studies', included: true },
  { name: 'Deep Conditional Probability Studies', included: true },
  { name: 'Expanded Datasets & Asset Coverage', included: true },
  { name: 'Unlimited Screener Results & Filters', included: true },
  { name: 'Extended Historical Timeframes', included: true },
  { name: 'AI-Powered Market Chat', included: true },
  { name: 'Real-time Price Alerts', included: true },
  { name: 'Priority Support', included: true },
];

const RESEARCH_FEATURES = [
  { name: 'Everything in Pro', included: true },
  { name: 'Full Video Course Library', included: true, highlight: true },
  { name: 'Trade Ideas & Signals', included: true, highlight: true },
  { name: 'Community Research Posts', included: true },
  { name: 'Backtesting Tools', included: true },
  { name: 'Portfolio Analytics', included: true },
  { name: 'Early Access to New Features', included: true },
];

const COMING_SOON = [
  'Options Flow Screening',
  'Agentic News Bots',
  'Hundreds of New Studies',
];

type PlanType = 'free' | 'pro' | 'research_education';

export function MembershipStep({ onComplete, onBack }: MembershipStepProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async (plan: PlanType) => {
    if (!user) return;
    
    setSelectedPlan(plan);
    setIsLoading(true);

    try {
      if (plan === 'pro' || plan === 'research_education') {
        // Ensure we have an active session before calling checkout
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error('Your session has expired. Please sign in again.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan },
        });
        
        if (error) throw error;
        
        if (data?.url) {
          // Use window.open for iframe contexts (e.g. Lovable preview), same-tab redirect for production
          if (window.self !== window.top) {
            window.open(data.url, '_blank');
          } else {
            window.location.href = data.url;
          }
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

  return (
    <Card className="bg-slate-900 border-slate-800 max-w-5xl mx-auto">
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
        <div className="grid md:grid-cols-3 gap-5">
          {/* Free Plan */}
          <div 
            className={cn(
              "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
              selectedPlan === 'free' 
                ? "border-purple-500 bg-slate-800/50" 
                : "border-slate-700 hover:border-slate-600 bg-slate-800/30"
            )}
            onClick={() => !isLoading && setSelectedPlan('free')}
          >
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <div className="text-3xl font-bold text-white">$0</div>
              <p className="text-slate-400 text-sm">Forever free</p>
            </div>
            
            <ul className="space-y-2.5 mb-5">
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
              "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
              selectedPlan === 'pro' 
                ? "border-purple-500 bg-purple-900/20" 
                : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
            )}
            onClick={() => !isLoading && setSelectedPlan('pro')}
          >
            <div className="text-center mb-5 mt-1">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <div className="text-3xl font-bold text-white">$50<span className="text-lg text-slate-400">/mo</span></div>
              <p className="text-slate-400 text-sm">Billed monthly</p>
            </div>
            
            <ul className="space-y-2 mb-4">
              {PRO_FEATURES.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className={cn(
                    "text-sm text-slate-300",
                    feature.highlight && "font-semibold text-amber-400"
                  )}>{feature.name}</span>
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

          {/* Research & Education Plan */}
          <div 
            className={cn(
              "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
              selectedPlan === 'research_education' 
                ? "border-amber-500 bg-amber-900/20" 
                : "border-amber-500/50 hover:border-amber-500 bg-gradient-to-b from-amber-900/15 to-slate-800/30"
            )}
            onClick={() => !isLoading && setSelectedPlan('research_education')}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                <GraduationCap className="h-3 w-3" />
                BEST VALUE
              </span>
            </div>

            <div className="text-center mb-5 mt-2">
              <h3 className="text-lg font-bold text-white mb-1">Research & Education</h3>
              <div className="text-3xl font-bold text-white">$100<span className="text-lg text-slate-400">/mo</span></div>
              <p className="text-slate-400 text-sm">Billed monthly</p>
            </div>
            
            <ul className="space-y-2 mb-4">
              {RESEARCH_FEATURES.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span className={cn(
                    "text-sm text-slate-300",
                    feature.highlight && "font-semibold text-amber-400"
                  )}>{feature.name}</span>
                </li>
              ))}
            </ul>

            {/* Coming Soon Section */}
            <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Coming Soon
              </p>
              <div className="flex flex-wrap gap-1">
                {COMING_SOON.map((feature, i) => (
                  <span key={i} className="text-xs bg-slate-800/50 px-2 py-0.5 rounded-full text-slate-400">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <Button 
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectPlan('research_education');
              }}
              disabled={isLoading}
            >
              {isLoading && selectedPlan === 'research_education' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Get Full Access'
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
