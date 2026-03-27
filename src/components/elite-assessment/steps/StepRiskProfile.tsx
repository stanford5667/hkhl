import React from 'react';
import { AlertTriangle, TrendingDown, Zap, Flame, Monitor, DollarSign, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { LabeledSlider, MultiSelectGrid, OptionCard } from '@/components/questionnaire/QuestionOptions';
import type { EliteFormData } from '../EliteOnboardingPage';

const MARKET_FEARS = [
  { value: 'bear_market', label: 'Bear Market', icon: <TrendingDown className="h-5 w-5 text-destructive" /> },
  { value: 'flash_crash', label: 'Flash Crash', icon: <Zap className="h-5 w-5 text-warning" /> },
  { value: 'inflation', label: 'Inflation', icon: <Flame className="h-5 w-5 text-orange-500" /> },
  { value: 'tech_collapse', label: 'Tech Collapse', icon: <Monitor className="h-5 w-5 text-primary" /> },
  { value: 'usd_devaluation', label: 'USD Devaluation', icon: <DollarSign className="h-5 w-5 text-emerald-500" /> },
];

const RISK_PROFILES = [
  { value: '8_10', label: '8% Return / 10% Max Draw', description: 'Conservative — stability-first approach', emoji: '🟢' },
  { value: '12_15', label: '12% Return / 15% Max Draw', description: 'Balanced — moderate risk for better returns', emoji: '🟡' },
  { value: '20_30', label: '20%+ Return / 30% Max Draw', description: 'Aggressive — maximum growth potential', emoji: '🔴' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

function Explainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export function StepRiskProfile({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Risk & Hedging</h2>
        <p className="text-muted-foreground text-sm">Define your risk boundaries and what you want protection against.</p>
      </div>

      {/* Drawdown slider */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Maximum Drawdown Tolerance
        </Label>
        <Explainer>
          Drawdown is the largest peak-to-trough decline your portfolio could experience before recovering. For example, a 15% drawdown means a $100K portfolio could temporarily drop to $85K. Lower = more conservative, higher = more room for volatility.
        </Explainer>
        <div className="p-4 rounded-xl border border-border bg-card">
          <LabeledSlider
            value={data.maxDrawdown}
            onChange={(v) => onChange({ maxDrawdown: v })}
            min={5}
            max={30}
            step={1}
            formatValue={(v) => `${v}%`}
            labels={[
              { value: 5, label: '5% (very tight)' },
              { value: 15, label: '15%' },
              { value: 30, label: '30% (aggressive)' },
            ]}
          />
        </div>
      </div>

      {/* Market fears */}
      <div className="space-y-3">
        <Label>Market Fears to Hedge Against</Label>
        <Explainer>
          Select the market scenarios you're most worried about. We'll factor these into your portfolio construction — for example, if you fear inflation, we may increase commodity or TIPS exposure. Select all that apply.
        </Explainer>
        <MultiSelectGrid
          options={MARKET_FEARS}
          selected={data.marketFears}
          onChange={(fears) => onChange({ marketFears: fears })}
          columns={2}
        />
      </div>

      {/* Return/risk profile */}
      <div className="space-y-3">
        <Label>Target Return / Risk Profile</Label>
        <Explainer>
          This pairs your expected annual return with the maximum portfolio decline you're willing to accept. Higher return targets require accepting larger potential drawdowns — there's no free lunch in investing.
        </Explainer>
        <div className="grid gap-2">
          {RISK_PROFILES.map(rp => (
            <OptionCard
              key={rp.value}
              label={rp.label}
              description={rp.description}
              emoji={rp.emoji}
              selected={data.targetReturnRisk === rp.value}
              onClick={() => onChange({ targetReturnRisk: rp.value })}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}