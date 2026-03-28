import React from 'react';
import { GraduationCap, RefreshCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const DIVERSIFICATION_ANSWERS = [
  { 
    value: 'correct', 
    label: 'It includes average performers, diluting winners', 
    description: '✓ Correct! Diversification sacrifices peak upside to protect against catastrophic downside. The goal is risk-adjusted returns, not raw returns.',
    emoji: '✅' 
  },
  { 
    value: 'incorrect_worse', 
    label: 'Diversification makes returns worse overall', 
    description: 'Not quite — diversification improves risk-adjusted returns. You give up some upside but dramatically reduce the chance of devastating losses.',
    emoji: '❌' 
  },
  { 
    value: 'unsure', 
    label: "I'm not sure", 
    description: 'No worries! A diversified portfolio includes both winners and losers. The trade-off: you won\'t catch every rocket ship, but you also won\'t be wiped out by a single failure.',
    emoji: '🤔' 
  },
];

const REBALANCING_ANSWERS = [
  { 
    value: 'correct', 
    label: 'To maintain your target allocation and risk level', 
    description: '✓ Correct! When stocks outperform, your portfolio drifts toward higher risk. Rebalancing brings you back to your plan.',
    emoji: '✅' 
  },
  { 
    value: 'timing', 
    label: 'To time the market and buy low, sell high', 
    description: 'That\'s a side effect, but the primary purpose is risk management — ensuring your portfolio stays aligned with your actual risk tolerance.',
    emoji: '🔄' 
  },
  { 
    value: 'unsure', 
    label: "I'm not sure", 
    description: 'Rebalancing means selling some of what has gone up and buying what has gone down to return to your original target mix. It\'s systematic discipline, not market timing.',
    emoji: '🤔' 
  },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepKnowledgeCheck({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Knowledge Check</h2>
        <p className="text-muted-foreground text-sm">
          These questions help us understand your investment knowledge so we can communicate at the right level. 
          There's no penalty for getting them "wrong" — honest answers help us help you.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Why might a diversified portfolio underperform a single hot stock?
        </Label>
        <Explainer>
          This explores your understanding of diversification's purpose and trade-offs. Many investors get frustrated when 
          their balanced portfolio trails a single tech stock that's surging. Understanding why this happens prevents the 
          dangerous impulse to abandon your strategy and chase performance — a behavior that destroys returns over time.
        </Explainer>
        <div className="grid gap-2">
          {DIVERSIFICATION_ANSWERS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.diversificationUnderstanding === o.value} onClick={() => onChange({ diversificationUnderstanding: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-primary" /> What is the purpose of portfolio rebalancing?
        </Label>
        <Explainer>
          Rebalancing is a cornerstone of disciplined investing. Without it, a portfolio that started as 60% stocks / 40% bonds 
          could drift to 80/20 after a bull market — exposing you to far more risk than you signed up for. Regular rebalancing 
          enforces a "buy low, sell high" discipline automatically by trimming winners and adding to underperformers.
        </Explainer>
        <div className="grid gap-2">
          {REBALANCING_ANSWERS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.rebalancingUnderstanding === o.value} onClick={() => onChange({ rebalancingUnderstanding: o.value })} compact />
          ))}
        </div>
      </div>

      {/* Educational summary based on answers */}
      {data.diversificationUnderstanding && data.rebalancingUnderstanding && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
          <h3 className="font-semibold text-foreground text-sm">📚 Your Knowledge Summary</h3>
          <p className="text-sm text-muted-foreground">
            {data.diversificationUnderstanding === 'correct' && data.rebalancingUnderstanding === 'correct'
              ? 'Excellent understanding! You grasp both diversification and rebalancing — we can recommend more sophisticated strategies with confidence.'
              : data.diversificationUnderstanding === 'correct' || data.rebalancingUnderstanding === 'correct'
              ? 'Good foundation! You understand key concepts well. We\'ll include educational context alongside our recommendations to fill any gaps.'
              : 'No worries — these concepts take time to learn. We\'ll provide clear explanations with every recommendation and keep strategies straightforward until you\'re comfortable.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
