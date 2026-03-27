import React from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import type { EliteFormData } from '../EliteOnboardingPage';

const OPTIONS_LEVELS = [
  { value: 'level_3_4', label: 'Level 3 / 4', description: 'Full spreads, naked options, and complex strategies', emoji: '⚡' },
  { value: 'basic', label: 'Basic (Level 1-2)', description: 'Covered calls, cash-secured puts, simple spreads', emoji: '📊' },
  { value: 'no', label: 'No Options Approval', description: 'Equities and ETFs only — no options strategies', emoji: '🚫' },
];

const REBAL_FREQ = [
  { value: 'daily', label: 'Daily', description: 'I can review and act on signals every trading day', emoji: '📈' },
  { value: 'weekly', label: 'Weekly', description: 'I'll check in once per week to rebalance', emoji: '📅' },
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
        <h2 className="text-2xl font-bold text-foreground mb-1">Execution Preferences</h2>
        <p className="text-muted-foreground text-sm">Tell us about your trading capabilities and availability.</p>
      </div>

      {/* Options approval */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Options Trading Approval
        </Label>
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

      {/* Rebalancing frequency */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Rebalancing Availability
        </Label>
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
    </div>
  );
}
