import React from 'react';
import { Wallet, Shield, TrendingUp, CreditCard, Building, Droplets } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const INCOME_STABILITY = [
  { value: 'very_stable', label: 'Very Stable', description: 'Secure salaried position, government job, or tenured role with predictable income', emoji: '🏢' },
  { value: 'mostly_stable', label: 'Mostly Stable', description: 'Employed full-time but some variability — bonuses, commissions, or performance-based pay', emoji: '📊' },
  { value: 'variable', label: 'Variable', description: 'Freelance, self-employed, contractor, or seasonal work with significant income swings', emoji: '📈' },
  { value: 'uncertain', label: 'Uncertain', description: 'Between roles, early-stage business, or otherwise unpredictable income situation', emoji: '⚠️' },
];

const EMERGENCY_FUND = [
  { value: 'less_than_3', label: 'Less Than 3 Months', description: 'Limited safety net — consider building reserves before aggressive investing', emoji: '🟡' },
  { value: '3_to_6', label: '3–6 Months', description: 'Solid foundation that covers most unexpected events', emoji: '🟢' },
  { value: '6_to_12', label: '6–12 Months', description: 'Strong buffer — you can weather extended disruptions without touching investments', emoji: '💚' },
  { value: 'over_12', label: '12+ Months', description: 'Excellent cushion — maximum flexibility for aggressive investing strategies', emoji: '🏆' },
];

const INCOME_RANGES = [
  { value: 'under_100k', label: 'Under $100K', description: 'Building wealth through disciplined saving and compounding', emoji: '🌱' },
  { value: '100k_250k', label: '$100K – $250K', description: 'Strong earning power with capacity for meaningful portfolio growth', emoji: '📈' },
  { value: '250k_500k', label: '$250K – $500K', description: 'High income allows for diversified strategies and tax optimization', emoji: '💰' },
  { value: '500k_1m', label: '$500K – $1M', description: 'Elite earnings enable sophisticated multi-strategy approaches', emoji: '🏛️' },
  { value: 'over_1m', label: '$1M+', description: 'Ultra-high income with access to exclusive investment opportunities', emoji: '👑' },
];

const DEBT_LEVELS = [
  { value: 'none', label: 'No Significant Debt', description: 'Clean balance sheet — all investment returns go toward wealth building', emoji: '✅' },
  { value: 'low_interest', label: 'Low-Interest Debt Only', description: 'Mortgage or low-rate auto loans — generally fine to invest alongside', emoji: '🏠' },
  { value: 'mixed', label: 'Mix of Debt Types', description: 'Some high-interest debt that may compete with investment returns', emoji: '⚖️' },
  { value: 'high_interest', label: 'Significant High-Interest Debt', description: 'Credit cards or high-rate loans — paying these down may outperform investing', emoji: '🔴' },
];

const TAX_SITUATIONS = [
  { value: 'w2_simple', label: 'W-2 Employee (Simple)', description: 'Standard paycheck with employer withholding — straightforward tax situation', emoji: '📋' },
  { value: 'w2_complex', label: 'W-2 + Side Income', description: 'Salaried plus rental income, freelancing, or other sources', emoji: '📑' },
  { value: 'self_employed', label: 'Self-Employed / Business Owner', description: 'More complex returns with deductions, estimated taxes, and entity structuring', emoji: '🏢' },
  { value: 'high_complexity', label: 'High Complexity', description: 'Multiple entities, international income, K-1s, or trust distributions', emoji: '📐' },
];

const LIQUIDITY_NEEDS = [
  { value: 'none_soon', label: 'No Major Needs', description: 'No large purchases or expenses planned — fully investable capital', emoji: '🔒' },
  { value: 'within_1_year', label: 'Within 1 Year', description: 'May need to access some capital for a purchase, tuition, or other expense', emoji: '📅' },
  { value: 'within_3_years', label: 'Within 3 Years', description: 'Planning a significant expense like home down payment or business investment', emoji: '🏡' },
  { value: 'ongoing', label: 'Ongoing Needs', description: 'Regular withdrawals for living expenses or distributions', emoji: '💸' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepFinancialSituation({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Financial Situation</h2>
        <p className="text-muted-foreground text-sm">
          Your broader financial picture determines how much risk you can actually absorb — not just how much you're willing to take. 
          Stable income and strong reserves let us pursue more aggressive strategies.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Income Stability
        </Label>
        <Explainer>
          Your income stability is one of the strongest predictors of how much investment risk you can handle. 
          If your paycheck is guaranteed, you can afford to ride out portfolio drawdowns because you won't need to sell investments to cover bills. 
          Variable income means we need to keep more of your portfolio in liquid, less volatile assets.
        </Explainer>
        <div className="grid gap-2">
          {INCOME_STABILITY.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.incomeStability === o.value} onClick={() => onChange({ incomeStability: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Emergency Fund
        </Label>
        <Explainer>
          Your emergency fund is the foundation of financial security. Without adequate reserves, a job loss or unexpected expense 
          could force you to sell investments at the worst possible time — locking in losses. Financial advisors typically 
          recommend 3–6 months of essential expenses in a high-yield savings account, separate from your investments.
        </Explainer>
        <div className="grid gap-2">
          {EMERGENCY_FUND.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.emergencyFundMonths === o.value} onClick={() => onChange({ emergencyFundMonths: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Annual Household Income
        </Label>
        <Explainer>
          Your income relative to your invested capital tells us about your "human capital" — your future earnings power. 
          High earners can afford to take more investment risk because they can replenish capital faster if things go wrong. 
          This also affects tax optimization strategies we recommend.
        </Explainer>
        <div className="grid gap-2">
          {INCOME_RANGES.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.annualIncomeRange === o.value} onClick={() => onChange({ annualIncomeRange: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Debt Profile
        </Label>
        <Explainer>
          Outstanding debt affects your investment strategy in two ways: high-interest debt (credit cards at 20%+) almost 
          always outperforms market returns when paid off, so that should be prioritized. Low-interest debt like mortgages 
          (3–7%) can coexist with investing since markets historically return 8–10% annually.
        </Explainer>
        <div className="grid gap-2">
          {DEBT_LEVELS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.debtLevel === o.value} onClick={() => onChange({ debtLevel: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" /> Tax Situation
        </Label>
        <Explainer>
          Your tax complexity determines which investment vehicles and strategies make sense. Simple W-2 earners benefit 
          from tax-loss harvesting and Roth conversions. Self-employed investors may leverage SEP-IRAs or Solo 401(k)s. 
          High-complexity situations may benefit from tax-efficient fund placement and municipal bonds.
        </Explainer>
        <div className="grid gap-2">
          {TAX_SITUATIONS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.taxSituation === o.value} onClick={() => onChange({ taxSituation: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" /> Upcoming Liquidity Needs
        </Label>
        <Explainer>
          If you'll need to withdraw capital soon, we must keep a portion in low-volatility, highly liquid assets. 
          Capital you won't touch for 5+ years can be invested aggressively. This question helps us segment your 
          portfolio into "buckets" — near-term spending, medium-term goals, and long-term growth.
        </Explainer>
        <div className="grid gap-2">
          {LIQUIDITY_NEEDS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.liquidityNeeds === o.value} onClick={() => onChange({ liquidityNeeds: o.value })} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
