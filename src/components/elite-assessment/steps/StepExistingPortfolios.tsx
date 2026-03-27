import React from 'react';
import { Briefcase, PieChart, AlertTriangle, BarChart3 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MultiSelectGrid, OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const ACCOUNT_TYPES = [
  { value: '401k', label: '401(k)', icon: <Briefcase className="h-5 w-5 text-primary" /> },
  { value: 'ira', label: 'Traditional IRA', icon: <Briefcase className="h-5 w-5 text-emerald-500" /> },
  { value: 'roth_ira', label: 'Roth IRA', icon: <Briefcase className="h-5 w-5 text-violet-500" /> },
  { value: 'taxable', label: 'Taxable Brokerage', icon: <BarChart3 className="h-5 w-5 text-orange-500" /> },
  { value: 'hsa', label: 'HSA', icon: <Briefcase className="h-5 w-5 text-blue-500" /> },
  { value: 'other', label: 'Other', icon: <Briefcase className="h-5 w-5 text-muted-foreground" /> },
];

const ASSET_MIX = [
  { value: 'mostly_stocks', label: 'Mostly Stocks', description: '70%+ in equities / ETFs', emoji: '📈' },
  { value: 'mostly_bonds', label: 'Mostly Bonds', description: '70%+ in fixed income', emoji: '📉' },
  { value: 'balanced', label: 'Balanced Mix', description: 'Roughly 50/50 stocks and bonds', emoji: '⚖️' },
  { value: 'alternatives', label: 'Heavy Alternatives', description: 'Significant real estate, commodities, or crypto', emoji: '🏠' },
  { value: 'unsure', label: 'Not Sure', description: 'I don\'t know my current allocation', emoji: '❓' },
];

const OPTIONS_EXP = [
  { value: 'active', label: 'Active Options Trader', description: 'I regularly trade options in other accounts', emoji: '⚡' },
  { value: 'some', label: 'Some Experience', description: 'I\'ve traded options occasionally', emoji: '📊' },
  { value: 'none', label: 'No Experience', description: 'I\'ve never traded options', emoji: '🆕' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepExistingPortfolios({ data, onChange }: Props) {
  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) onChange({ otherAccountsValue: num });
    else if (e.target.value === '') onChange({ otherAccountsValue: 0 });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Existing Portfolios</h2>
        <p className="text-muted-foreground text-sm">Understanding your full financial picture helps us avoid overlap and optimize your overall allocation.</p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" /> Other Investment Accounts
        </Label>
        <Explainer>
          Select all investment accounts you currently hold outside of this strategy. This helps us understand your total exposure and avoid over-concentrating in any single asset class across your entire portfolio.
        </Explainer>
        <MultiSelectGrid
          options={ACCOUNT_TYPES}
          selected={data.otherAccounts}
          onChange={(accounts) => onChange({ otherAccounts: accounts })}
          columns={3}
        />
      </div>

      {data.otherAccounts.length > 0 && (
        <div className="space-y-2">
          <Label>Estimated Total Value Across All Other Accounts</Label>
          <Explainer>
            A rough estimate is fine. This helps us understand the proportion of your wealth allocated to this strategy vs. your overall investments.
          </Explainer>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="text"
              value={data.otherAccountsValue ? data.otherAccountsValue.toLocaleString() : ''}
              onChange={handleNumber}
              className="pl-7 h-12 text-lg"
              placeholder="500,000"
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" /> Current Asset Mix
        </Label>
        <Explainer>
          What does your existing portfolio look like? If you're already heavy in stocks, we might recommend more diversification. If you're heavy in bonds, we can be more aggressive with this allocation.
        </Explainer>
        <div className="grid gap-2">
          {ASSET_MIX.map(m => (
            <OptionCard
              key={m.value}
              label={m.label}
              description={m.description}
              emoji={m.emoji}
              selected={data.currentAssetMix === m.value}
              onClick={() => onChange({ currentAssetMix: m.value })}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Concentrated Positions
        </Label>
        <Explainer>
          Do you hold more than 20% of your total portfolio in a single stock or asset? Concentrated positions create significant risk — if that one holding drops, your entire portfolio takes a major hit.
        </Explainer>
        <div className="grid grid-cols-2 gap-2">
          <OptionCard
            label="Yes"
            description="I have concentrated positions"
            emoji="⚠️"
            selected={data.hasConcentratedPositions === true}
            onClick={() => onChange({ hasConcentratedPositions: true })}
            compact
          />
          <OptionCard
            label="No"
            description="Well diversified"
            emoji="✅"
            selected={data.hasConcentratedPositions === false}
            onClick={() => onChange({ hasConcentratedPositions: false })}
            compact
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Options Experience
        </Label>
        <Explainer>
          Your experience with options trading helps us determine how complex of a strategy to recommend. More experience means we can utilize advanced strategies like iron condors and strangles.
        </Explainer>
        <div className="grid gap-2">
          {OPTIONS_EXP.map(o => (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              emoji={o.emoji}
              selected={data.otherOptionsExperience === o.value}
              onClick={() => onChange({ otherOptionsExperience: o.value })}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}
