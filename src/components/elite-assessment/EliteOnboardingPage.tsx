import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StepFinancials } from './steps/StepFinancials';
import { StepGoals } from './steps/StepGoals';
import { StepRiskProfile } from './steps/StepRiskProfile';
import { StepExistingPortfolios } from './steps/StepExistingPortfolios';
import { StepPreferences } from './steps/StepPreferences';
import { StepExecution } from './steps/StepExecution';

export interface EliteFormData {
  // Step 1 — Financial Profile
  liquidNetWorth: number;
  capitalAllocated: number;
  primaryObjective: string;
  isNonUsAccredited: boolean;
  // Step 2 — Goals
  investmentPurpose: string;
  timeHorizon: string;
  goalPriority: string;
  // Step 3 — Risk & Personality
  maxDrawdown: number;
  marketFears: string[];
  targetReturnRisk: string;
  lossReaction: string;
  regretPreference: string;
  experienceLevel: string;
  // Step 4 — Existing Portfolios
  otherAccounts: string[];
  otherAccountsValue: number;
  currentAssetMix: string;
  hasConcentratedPositions: boolean;
  otherOptionsExperience: string;
  // Step 5 — Preferences
  ethicalExclusions: string[];
  internationalPreference: string;
  volatilityPreference: string;
  cryptoStance: string;
  // Step 6 — Execution
  optionsApproval: string;
  rebalancingFrequency: string;
}

const INITIAL_DATA: EliteFormData = {
  liquidNetWorth: 250000,
  capitalAllocated: 100000,
  primaryObjective: '',
  isNonUsAccredited: false,
  investmentPurpose: '',
  timeHorizon: '',
  goalPriority: '',
  maxDrawdown: 15,
  marketFears: [],
  targetReturnRisk: '',
  lossReaction: '',
  regretPreference: '',
  experienceLevel: '',
  otherAccounts: [],
  otherAccountsValue: 0,
  currentAssetMix: '',
  hasConcentratedPositions: false,
  otherOptionsExperience: '',
  ethicalExclusions: [],
  internationalPreference: '',
  volatilityPreference: '',
  cryptoStance: '',
  optionsApproval: '',
  rebalancingFrequency: '',
};

const STEPS = ['Financial Profile', 'Goals & Timeline', 'Risk & Personality', 'Existing Portfolios', 'Preferences', 'Execution'];

interface EliteOnboardingPageProps {
  onComplete?: () => void;
}

export default function EliteOnboardingPage({ onComplete }: EliteOnboardingPageProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<EliteFormData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);

  const update = (partial: Partial<EliteFormData>) =>
    setData(prev => ({ ...prev, ...partial }));

  const canAdvance = (): boolean => {
    if (step === 0) return !!data.primaryObjective && data.capitalAllocated > 0;
    if (step === 1) return !!data.investmentPurpose && !!data.timeHorizon && !!data.goalPriority;
    if (step === 2) return !!data.targetReturnRisk && data.marketFears.length > 0 && !!data.lossReaction && !!data.experienceLevel;
    if (step === 3) return !!data.currentAssetMix && !!data.otherOptionsExperience;
    if (step === 4) return !!data.internationalPreference && !!data.volatilityPreference && !!data.cryptoStance;
    if (step === 5) return !!data.optionsApproval && !!data.rebalancingFrequency;
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
        investment_purpose: data.investmentPurpose,
        time_horizon: data.timeHorizon,
        goal_priority: data.goalPriority,
        loss_reaction: data.lossReaction,
        regret_preference: data.regretPreference,
        experience_level: data.experienceLevel,
        other_accounts: data.otherAccounts,
        other_accounts_value: data.otherAccountsValue,
        current_asset_mix: data.currentAssetMix,
        has_concentrated_positions: data.hasConcentratedPositions,
        other_options_experience: data.otherOptionsExperience,
        ethical_exclusions: data.ethicalExclusions,
        international_preference: data.internationalPreference,
        volatility_preference: data.volatilityPreference,
        crypto_stance: data.cryptoStance,
      } as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Profile saved successfully');
      if (onComplete) {
        onComplete();
      } else {
        navigate('/elite-dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Elite Client Assessment</h1>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-6">
        <div className="flex gap-1.5">
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
            {step === 1 && <StepGoals data={data} onChange={update} />}
            {step === 2 && <StepRiskProfile data={data} onChange={update} />}
            {step === 3 && <StepExistingPortfolios data={data} onChange={update} />}
            {step === 4 && <StepPreferences data={data} onChange={update} />}
            {step === 5 && <StepExecution data={data} onChange={update} />}
          </motion.div>
        </AnimatePresence>
      </div>

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
