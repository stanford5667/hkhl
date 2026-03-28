import React from 'react';
import { AlertTriangle, TrendingDown, Zap, Flame, Monitor, DollarSign, Brain, GraduationCap, Repeat, Compass } from 'lucide-react';
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

const MARKET_CYCLE_REACTIONS = [
  { value: 'stay_course', label: 'Stay the Course', description: 'I trust my long-term plan and don\'t change based on market conditions', emoji: '🧘' },
  { value: 'tactical_shifts', label: 'Tactical Shifts', description: 'I\'d make small adjustments based on economic outlook and valuations', emoji: '🔄' },
  { value: 'active_timing', label: 'Active Timing', description: 'I\'d significantly change my allocation to try to avoid downturns and capture upswings', emoji: '⚡' },
  { value: 'not_sure', label: 'Not Sure Yet', description: 'I haven\'t experienced enough cycles to know my true reaction', emoji: '🤔' },
];

const INVESTMENT_STYLES = [
  { value: 'passive_index', label: 'Passive / Index Investing', description: 'Buy and hold broad market ETFs — low cost, low effort, market returns', emoji: '📊' },
  { value: 'factor_based', label: 'Factor-Based / Smart Beta', description: 'Tilting toward value, momentum, quality, or size factors for potential outperformance', emoji: '🧪' },
  { value: 'active_stock_picking', label: 'Active Stock Picking', description: 'Selecting individual companies based on research and conviction', emoji: '🔍' },
  { value: 'hybrid', label: 'Hybrid Approach', description: 'Core passive holdings with satellite active positions for alpha generation', emoji: '⚖️' },
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
        <p className="text-muted-foreground text-sm">
          Your risk profile is the most important input in portfolio construction. We assess both your financial 
          ability to take risk and your emotional tolerance — because the strategy only works if you can stick with it.
        </p>
      </div>

      {/* Drawdown slider */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Maximum Drawdown Tolerance
        </Label>
        <Explainer>
          Drawdown is the largest peak-to-trough decline your portfolio could experience before recovering. 
          For example, a 15% drawdown means a $100K portfolio could temporarily drop to $85K. During the 2008 
          financial crisis, the S&P 500 dropped ~55%. During COVID in 2020, it dropped ~34%. 
          Be honest about what you can stomach — lower = more conservative, higher = more room for volatility.
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
          Imagine your $100,000 portfolio drops to $80,000 in a single month. What would you actually do? 
          Research shows that stated risk tolerance and actual behavior during losses are often very different. 
          Be brutally honest — this reveals your true risk tolerance better than any theoretical question. 
          There's no wrong answer, but the wrong portfolio for your personality is devastating.
        </Explainer>
        <div className="grid gap-2">
          {LOSS_REACTIONS.map(lr => (
            <OptionCard key={lr.value} label={lr.label} description={lr.description} emoji={lr.emoji}
              selected={data.lossReaction === lr.value} onClick={() => onChange({ lossReaction: lr.value })} compact />
          ))}
        </div>
      </div>

      {/* Regret preference */}
      <div className="space-y-3">
        <Label>Which Would You Regret More?</Label>
        <Explainer>
          This question reveals whether you're fundamentally loss-averse or opportunity-driven. Neither is wrong — 
          it helps us calibrate between conservative capital preservation and aggressive growth. Loss-averse investors 
          need portfolios that minimize downside even at the cost of upside. Opportunity-seekers need portfolios that 
          capture market rallies even if it means riding out occasional drawdowns.
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

      {/* Market cycle reaction */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" /> Market Cycle Philosophy
        </Label>
        <Explainer>
          Markets move in cycles of expansion and contraction. Some investors believe in staying fully invested through all conditions 
          ("time in the market beats timing the market"). Others prefer to tactically shift allocations based on economic indicators. 
          Research shows that most active timers underperform — but a small minority with disciplined, rules-based approaches can add value.
          Your answer here determines whether we build a static or dynamic allocation model.
        </Explainer>
        <div className="grid gap-2">
          {MARKET_CYCLE_REACTIONS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.marketCycleReaction === o.value} onClick={() => onChange({ marketCycleReaction: o.value })} compact />
          ))}
        </div>
      </div>

      {/* Experience level */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Investment Experience
        </Label>
        <Explainer>
          Your experience level helps us communicate appropriately and determine strategy complexity. Beginners 
          get more guidance, educational context, and simpler strategies. Advanced investors can access more 
          sophisticated approaches like factor tilts, options overlays, and alternative asset allocation.
        </Explainer>
        <div className="grid gap-2">
          {EXPERIENCE_LEVELS.map(el => (
            <OptionCard key={el.value} label={el.label} description={el.description} emoji={el.emoji}
              selected={data.experienceLevel === el.value} onClick={() => onChange({ experienceLevel: el.value })} compact />
          ))}
        </div>
      </div>

      {/* Investment style */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" /> Preferred Investment Style
        </Label>
        <Explainer>
          Your investing philosophy shapes which strategies we recommend. Passive indexing is evidence-based and low-cost — 
          most investors do best here. Factor-based approaches tilt toward academically-proven return drivers. Active stock 
          picking requires significant time and skill but offers the potential for outsized returns. Many sophisticated 
          investors use a hybrid "core-satellite" approach: 70–80% in passive indexes with 20–30% in active positions.
        </Explainer>
        <div className="grid gap-2">
          {INVESTMENT_STYLES.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.investmentStyle === o.value} onClick={() => onChange({ investmentStyle: o.value })} compact />
          ))}
        </div>
      </div>

      {/* Market fears */}
      <div className="space-y-3">
        <Label>Market Fears to Hedge Against</Label>
        <Explainer>
          Select the market scenarios you're most worried about. We'll factor these into your portfolio construction — 
          for example, if you fear inflation, we may increase commodity or TIPS exposure. If you fear USD devaluation, 
          we'll add international and hard asset positions. Select all that apply.
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
          This pairs your expected annual return with the maximum portfolio decline you're willing to accept. 
          Higher return targets require accepting larger potential drawdowns — there's no free lunch in investing. 
          The 8%/10% profile is similar to a 60/40 balanced fund. The 20%+/30% profile requires concentrated 
          equity or options exposure with significant volatility.
        </Explainer>
        <div className="grid gap-2">
          {RISK_PROFILES.map(rp => (
            <OptionCard key={rp.value} label={rp.label} description={rp.description} emoji={rp.emoji}
              selected={data.targetReturnRisk === rp.value} onClick={() => onChange({ targetReturnRisk: rp.value })} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
