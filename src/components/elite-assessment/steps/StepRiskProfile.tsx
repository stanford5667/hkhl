import React from 'react';
import { AlertTriangle, TrendingDown, Zap, Flame, Monitor, DollarSign, Brain, GraduationCap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { LabeledSlider, MultiSelectGrid, OptionCard, ScenarioPicker } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
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

const LOSS_REACTIONS = [
  { value: 'sell_all', label: 'Sell Everything', description: 'I\'d panic and move to cash immediately', emoji: '😰' },
  { value: 'sell_some', label: 'Sell Some', description: 'I\'d reduce exposure but stay partially invested', emoji: '😟' },
  { value: 'hold', label: 'Hold Steady', description: 'I\'d be uncomfortable but stick with the plan', emoji: '😐' },
  { value: 'buy_more', label: 'Buy the Dip', description: 'I\'d see it as an opportunity to invest more', emoji: '😎' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to investing, learning the basics', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', description: 'A few years of experience with stocks & funds', emoji: '📚' },
  { value: 'advanced', label: 'Advanced', description: 'Deep knowledge of markets, options, and strategies', emoji: '🎓' },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepRiskProfile({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Risk & Personality</h2>
        <p className="text-muted-foreground text-sm">Define your risk boundaries and help us understand your investor personality.</p>
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

      {/* Loss reaction scenario */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Loss Reaction Scenario
        </Label>
        <Explainer>
          Imagine your $100,000 portfolio drops to $80,000 in a single month. What would you actually do? Be honest — this reveals your true risk tolerance better than any theoretical question. There's no wrong answer.
        </Explainer>
        <div className="grid gap-2">
          {LOSS_REACTIONS.map(lr => (
            <OptionCard
              key={lr.value}
              label={lr.label}
              description={lr.description}
              emoji={lr.emoji}
              selected={data.lossReaction === lr.value}
              onClick={() => onChange({ lossReaction: lr.value })}
              compact
            />
          ))}
        </div>
      </div>

      {/* Regret preference */}
      <div className="space-y-3">
        <Label>Which Would You Regret More?</Label>
        <Explainer>
          This question reveals whether you're more loss-averse or opportunity-driven. Neither is wrong — it helps us calibrate how aggressive or conservative your strategy should be.
        </Explainer>
        <ScenarioPicker
          optionA={{
            id: 'A',
            label: 'Missing Out on Gains',
            description: 'The market surged 30% and I was sitting in cash. I missed a huge opportunity.',
            traits: ['Growth-oriented', 'FOMO-sensitive'],
          }}
          optionB={{
            id: 'B',
            label: 'Losing Money',
            description: 'My portfolio dropped 20% and I lost real money. That keeps me up at night.',
            traits: ['Loss-averse', 'Capital preservation'],
          }}
          selected={data.regretPreference as 'A' | 'B' | null}
          onChange={(choice) => onChange({ regretPreference: choice })}
        />
      </div>

      {/* Experience level */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Investment Experience
        </Label>
        <Explainer>
          Your experience level helps us communicate appropriately and determine strategy complexity. Beginners get more guidance and simpler strategies; advanced investors can access more sophisticated approaches.
        </Explainer>
        <div className="grid gap-2">
          {EXPERIENCE_LEVELS.map(el => (
            <OptionCard
              key={el.value}
              label={el.label}
              description={el.description}
              emoji={el.emoji}
              selected={data.experienceLevel === el.value}
              onClick={() => onChange({ experienceLevel: el.value })}
              compact
            />
          ))}
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
