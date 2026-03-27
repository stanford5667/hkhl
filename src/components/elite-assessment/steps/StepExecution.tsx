import React from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const OPTIONS_LEVELS = [
  { value: 'level_3_4', label: 'Level 3 / 4', description: 'Full spreads, naked options, and complex strategies', emoji: '⚡' },
  { value: 'basic', label: 'Basic (Level 1-2)', description: 'Covered calls, cash-secured puts, simple spreads', emoji: '📊' },
  { value: 'no', label: 'No Options Approval', description: 'Equities and ETFs only — no options strategies', emoji: '🚫' },
];

const REBAL_FREQ = [
  { value: 'daily', label: 'Daily', description: 'I can review and act on signals every trading day', emoji: '📈' },
  { value: 'weekly', label: 'Weekly', description: 'Check in once per week to rebalance', emoji: '📅' },
  { value: 'monthly', label: 'Monthly', description: 'I prefer a monthly review and adjustment cadence', emoji: '🗓️' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepExecution({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Execution & Review</h2>
        <p className="text-muted-foreground text-sm">Tell us about your trading capabilities and review your profile.</p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Options Trading Approval
        </Label>
        <Explainer>
          This refers to the approval level your brokerage has granted you. Level 1-2 allows basic strategies like covered calls. Level 3-4 unlocks advanced strategies like iron condors and naked puts. If unsure, check your brokerage account settings.
        </Explainer>
        <div className="grid gap-2">
          {OPTIONS_LEVELS.map(opt => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              emoji={opt.emoji}
              selected={data.optionsApproval === opt.value}
              onClick={() => onChange({ optionsApproval: opt.value })}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Rebalancing Availability
        </Label>
        <Explainer>
          How often can you log in and execute trades? More frequent rebalancing allows us to capture shorter-term opportunities but requires more of your time. Monthly is fine for most long-term strategies.
        </Explainer>
        <div className="grid gap-2">
          {REBAL_FREQ.map(freq => (
            <OptionCard
              key={freq.value}
              label={freq.label}
              description={freq.description}
              emoji={freq.emoji}
              selected={data.rebalancingFrequency === freq.value}
              onClick={() => onChange({ rebalancingFrequency: freq.value })}
              compact
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <h3 className="font-semibold text-foreground">Profile Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {data.primaryObjective && (
            <SummaryItem label="Objective" value={data.primaryObjective.replace(/_/g, ' ')} />
          )}
          {data.investmentPurpose && (
            <SummaryItem label="Purpose" value={data.investmentPurpose.replace(/_/g, ' ')} />
          )}
          {data.timeHorizon && (
            <SummaryItem label="Time Horizon" value={data.timeHorizon.replace(/_/g, ' ')} />
          )}
          {data.targetReturnRisk && (
            <SummaryItem label="Risk Profile" value={data.targetReturnRisk.replace(/_/g, '/')} />
          )}
          <SummaryItem label="Max Drawdown" value={`${data.maxDrawdown}%`} />
          <SummaryItem label="Capital" value={`$${data.capitalAllocated.toLocaleString()}`} />
          {data.experienceLevel && (
            <SummaryItem label="Experience" value={data.experienceLevel} />
          )}
          {data.cryptoStance && (
            <SummaryItem label="Crypto" value={data.cryptoStance.replace(/_/g, ' ')} />
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground capitalize">{value}</p>
    </div>
  );
}
