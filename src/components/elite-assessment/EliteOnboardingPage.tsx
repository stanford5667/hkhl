import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StepFinancials } from './steps/StepFinancials';
import { StepRiskProfile } from './steps/StepRiskProfile';
import { StepExecution } from './steps/StepExecution';

export interface EliteFormData {
  liquidNetWorth: number;
  capitalAllocated: number;
  primaryObjective: string;
  isNonUsAccredited: boolean;
  maxDrawdown: number;
  marketFears: string[];
  targetReturnRisk: string;
  optionsApproval: string;
  rebalancingFrequency: string;
}

const INITIAL_DATA: EliteFormData = {
  liquidNetWorth: 250000,
  capitalAllocated: 100000,
  primaryObjective: '',
  isNonUsAccredited: false,
  maxDrawdown: 15,
  marketFears: [],
  targetReturnRisk: '',
  optionsApproval: '',
  rebalancingFrequency: '',
};

const STEPS = ['Financial Profile', 'Risk & Hedging', 'Execution'];

export default function EliteOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<EliteFormData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);

  const update = (partial: Partial<EliteFormData>) =>
    setData(prev => ({ ...prev, ...partial }));

  const canAdvance = (): boolean => {
    if (step === 0) return !!data.primaryObjective && data.capitalAllocated > 0;
    if (step === 1) return !!data.targetReturnRisk && data.marketFears.length > 0;
    if (step === 2) return !!data.optionsApproval && !!data.rebalancingFrequency;
    return false;
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please sign in first'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('elite_client_profiles' as any).upsert({
        user_id: user.id,
        liquid_net_worth: data.liquidNetWorth,
        capital_allocated: data.capitalAllocated,
        primary_objective: data.primaryObjective,
        is_non_us_accredited: data.isNonUsAccredited,
        max_drawdown_tolerance: data.maxDrawdown,
        market_fears: data.marketFears,
        target_return_risk: data.targetReturnRisk,
        options_approval: data.optionsApproval,
        rebalancing_frequency: data.rebalancingFrequency,
      } as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Profile saved successfully');
      navigate('/elite-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Elite Client Assessment</h1>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-6">
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepFinancials data={data} onChange={update} />}
            {step === 1 && <StepRiskProfile data={data} onChange={update} />}
            {step === 2 && <StepExecution data={data} onChange={update} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canAdvance() || submitting}>
              {submitting ? 'Saving…' : (
                <>Submit <CheckCircle2 className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
