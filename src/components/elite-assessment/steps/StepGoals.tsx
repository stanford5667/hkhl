import React from 'react';
import { Compass, Clock, Star } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const PURPOSES = [
  { value: 'retirement', label: 'Retirement', description: 'Building long-term wealth for retirement income', emoji: '🏖️' },
  { value: 'wealth_building', label: 'Wealth Building', description: 'Growing capital aggressively over time', emoji: '📈' },
  { value: 'financial_independence', label: 'Financial Independence', description: 'Reaching a point where investments cover expenses', emoji: '🔑' },
  { value: 'legacy', label: 'Legacy / Estate', description: 'Preserving and growing wealth for future generations', emoji: '🏛️' },
  { value: 'specific_goal', label: 'Specific Goal', description: 'Funding a purchase, business, or major expense', emoji: '🎯' },
];

const HORIZONS = [
  { value: 'under_2', label: 'Under 2 Years', description: 'Short-term — need liquidity soon', emoji: '⏱️' },
  { value: '2_5', label: '2–5 Years', description: 'Medium-term — some flexibility', emoji: '📅' },
  { value: '5_10', label: '5–10 Years', description: 'Long-term — can weather volatility', emoji: '🗓️' },
  { value: 'over_10', label: '10+ Years', description: 'Very long-term — maximum compounding runway', emoji: '🚀' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical', description: 'This money is essential — I can\'t afford to lose it', emoji: '🔴' },
  { value: 'important', label: 'Important', description: 'Meaningful goal but I have other resources as backup', emoji: '🟡' },
  { value: 'aspirational', label: 'Aspirational', description: 'Would be great to achieve but not life-changing if I miss it', emoji: '🟢' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepGoals({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Goals & Time Horizon</h2>
        <p className="text-muted-foreground text-sm">Understanding your "why" shapes the entire portfolio strategy.</p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" /> Investment Purpose
        </Label>
        <Explainer>
          Your primary reason for investing determines the strategy type. Retirement-focused portfolios prioritize stability and income, while wealth-building portfolios can take on more risk for higher growth.
        </Explainer>
        <div className="grid gap-2">
          {PURPOSES.map(p => (
            <OptionCard
              key={p.value}
              label={p.label}
              description={p.description}
              emoji={p.emoji}
              selected={data.investmentPurpose === p.value}
              onClick={() => onChange({ investmentPurpose: p.value })}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Time Horizon
        </Label>
        <Explainer>
          How long until you need this money? Longer time horizons allow for more aggressive strategies since you have more time to recover from downturns. Shorter horizons require more conservative, capital-preservation approaches.
        </Explainer>
        <div className="grid gap-2">
          {HORIZONS.map(h => (
            <OptionCard
              key={h.value}
              label={h.label}
              description={h.description}
              emoji={h.emoji}
              selected={data.timeHorizon === h.value}
              onClick={() => onChange({ timeHorizon: h.value })}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" /> Goal Priority
        </Label>
        <Explainer>
          How critical is this investment goal to your financial well-being? Critical goals require more conservative risk management, while aspirational goals can tolerate higher volatility for potentially greater returns.
        </Explainer>
        <div className="grid gap-2">
          {PRIORITIES.map(p => (
            <OptionCard
              key={p.value}
              label={p.label}
              description={p.description}
              emoji={p.emoji}
              selected={data.goalPriority === p.value}
              onClick={() => onChange({ goalPriority: p.value })}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}
