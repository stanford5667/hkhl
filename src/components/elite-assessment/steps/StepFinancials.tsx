import React from 'react';
import { DollarSign, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const OBJECTIVES = [
  { value: 'aggressive_growth', label: 'Aggressive Growth', description: 'Maximize returns with higher risk tolerance', emoji: '🚀' },
  { value: 'hedging', label: 'Hedging', description: 'Protect existing portfolio from downside', emoji: '🛡️' },
  { value: 'income', label: 'Income', description: 'Generate steady cash flow via dividends & premiums', emoji: '💰' },
  { value: 'uncorrelated_return', label: 'Uncorrelated Return', description: 'Returns independent of broad market direction', emoji: '🎯' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export function StepFinancials({ data, onChange }: Props) {
  const handleNumber = (field: keyof EliteFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) onChange({ [field]: num });
    else if (e.target.value === '') onChange({ [field]: 0 });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Financial Profile</h2>
        <p className="text-muted-foreground text-sm">Help us understand your financial position to tailor the strategy.</p>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Total Liquid Net Worth
        </Label>
        <Explainer>
          This is the total value of assets you can convert to cash within 30 days — including stocks, bonds, savings, and money market accounts. Do not include real estate, retirement accounts, or illiquid investments.
        </Explainer>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="text"
            value={data.liquidNetWorth ? data.liquidNetWorth.toLocaleString() : ''}
            onChange={handleNumber('liquidNetWorth')}
            className="pl-7 h-12 text-lg"
            placeholder="250,000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Capital Allocated to This Strategy
        </Label>
        <Explainer>
          The specific dollar amount you want to deploy in this managed strategy. We recommend allocating no more than 20-30% of your liquid net worth to any single strategy.
        </Explainer>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="text"
            value={data.capitalAllocated ? data.capitalAllocated.toLocaleString() : ''}
            onChange={handleNumber('capitalAllocated')}
            className="pl-7 h-12 text-lg"
            placeholder="100,000"
          />
        </div>
        {data.liquidNetWorth > 0 && data.capitalAllocated > 0 && (
          <p className="text-xs text-muted-foreground">
            {((data.capitalAllocated / data.liquidNetWorth) * 100).toFixed(1)}% of liquid net worth
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Primary Objective</Label>
        <Explainer>
          Choose the goal that best matches why you're investing. This determines the asset mix and strategy type we'll recommend — from high-growth equities to defensive hedges.
        </Explainer>
        <div className="grid gap-2">
          {OBJECTIVES.map(obj => (
            <OptionCard
              key={obj.value}
              label={obj.label}
              description={obj.description}
              emoji={obj.emoji}
              selected={data.primaryObjective === obj.value}
              onClick={() => onChange({ primaryObjective: obj.value })}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Explainer>
          Accredited investor status (outside the US) may grant access to additional alternative investment strategies not available to retail investors.
        </Explainer>
        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
          <Checkbox
            id="accredited"
            checked={data.isNonUsAccredited}
            onCheckedChange={(c) => onChange({ isNonUsAccredited: !!c })}
            className="mt-0.5"
          />
          <label htmlFor="accredited" className="text-sm leading-snug cursor-pointer">
            <span className="font-medium text-foreground">Non-US Accredited Investor</span>
            <br />
            <span className="text-muted-foreground text-xs">
              I confirm my status as an accredited investor outside the United States.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
