import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, BarChart3, ShieldAlert, ChevronDown, ChevronUp, BookOpen, Lightbulb, GraduationCap } from 'lucide-react';
import { getRelevantTopics, EDUCATION_TOPICS } from './learning/tradeEducation';

interface Position {
  ticker: string;
  current_value: number | null;
  quantity: number;
  instrument_type: string;
}

interface Goals {
  goal_type: string;
  target_annual_return_pct: number;
  max_drawdown_pct: number;
  benchmark_ticker: string;
  risk_budget_pct: number;
}

interface Props {
  ticker: string;
  action: 'buy' | 'sell';
  tradeValue: number;
  currentValue: number;
  cashBalance: number;
  positions: Position[];
  goals: Goals | null;
  instrumentType: 'stock' | 'option';
  optionType?: string | null;
}

interface Alert {
  type: 'warning' | 'danger' | 'info' | 'ok';
  title: string;
  detail: string;
}

export function PreTradeImpactAlert({
  ticker, action, tradeValue, currentValue, cashBalance, positions, goals, instrumentType, optionType,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const alerts = useMemo(() => {
    if (!tradeValue || tradeValue <= 0) return [];

    const results: Alert[] = [];
    const totalPortfolio = currentValue;
    if (totalPortfolio <= 0) return [];

    const postTradePortfolio = totalPortfolio;

    // --- 1. Concentration after trade ---
    const existingValue = positions
      .filter(p => p.ticker.toUpperCase() === ticker.toUpperCase())
      .reduce((sum, p) => sum + (p.current_value || 0), 0);

    const newPositionValue = action === 'buy'
      ? existingValue + tradeValue
      : Math.max(0, existingValue - tradeValue);

    const newConcentration = (newPositionValue / postTradePortfolio) * 100;

    if (newConcentration > 25) {
      results.push({
        type: 'danger',
        title: `${ticker} would be ${newConcentration.toFixed(1)}% of portfolio`,
        detail: `Institutional guideline: single positions should be 5-10% max for diversified portfolios. This exceeds 25%.`,
      });
    } else if (newConcentration > 15) {
      results.push({
        type: 'warning',
        title: `${ticker} would be ${newConcentration.toFixed(1)}% of portfolio`,
        detail: `Above the 10% threshold used by most fund managers. Acceptable for high-conviction positions.`,
      });
    } else if (action === 'buy') {
      results.push({
        type: 'ok',
        title: `${ticker} at ${newConcentration.toFixed(1)}% — within diversification norms`,
        detail: `Position size is within institutional guidelines.`,
      });
    }

    // --- 2. Cash deployment / risk budget ---
    if (action === 'buy') {
      const postCash = cashBalance - tradeValue;
      const postCashPct = (postCash / postTradePortfolio) * 100;

      if (goals) {
        const deployedPct = 100 - postCashPct;
        const riskBudget = goals.risk_budget_pct;

        if (deployedPct > riskBudget) {
          results.push({
            type: 'danger',
            title: `Risk budget exceeded: ${deployedPct.toFixed(0)}% deployed vs ${riskBudget}% limit`,
            detail: `After this trade you'd have only $${postCash.toFixed(0)} cash (${postCashPct.toFixed(1)}%). Your goal allows ${riskBudget}% max deployment.`,
          });
        } else if (deployedPct > riskBudget * 0.9) {
          results.push({
            type: 'warning',
            title: `Near risk budget: ${deployedPct.toFixed(0)}% deployed of ${riskBudget}% allowed`,
            detail: `$${postCash.toFixed(0)} cash remaining. Close to your self-set deployment ceiling.`,
          });
        }
      }

      if (postCashPct < 5) {
        results.push({
          type: 'warning',
          title: `Cash drops below 5% — limited flexibility`,
          detail: `Only $${postCash.toFixed(0)} (${postCashPct.toFixed(1)}%) left for opportunities or margin of safety.`,
        });
      }
    }

    // --- 3. Goal alignment check ---
    if (goals) {
      const goalType = goals.goal_type;

      if (goalType === 'preservation' && action === 'buy') {
        const tradeAsPct = (tradeValue / totalPortfolio) * 100;
        if (tradeAsPct > 10) {
          results.push({
            type: 'warning',
            title: `Large trade for a preservation goal`,
            detail: `Adding ${tradeAsPct.toFixed(1)}% in a single position. Capital preservation strategies typically use smaller, more incremental positions.`,
          });
        }
        if (instrumentType === 'option') {
          results.push({
            type: 'warning',
            title: `Options in a preservation portfolio`,
            detail: `Options carry expiration risk and can lose 100% of premium. Ensure this aligns with your capital preservation objective.`,
          });
        }
      }

      if (goalType === 'income') {
        if (instrumentType === 'option' && optionType === 'call' && action === 'buy') {
          results.push({
            type: 'info',
            title: `Long calls don't generate income`,
            detail: `Your goal is income generation. Long calls are a growth/speculative play. Consider covered calls or cash-secured puts for income.`,
          });
        }
      }

      if (goalType === 'benchmark_beat') {
        const sameTickerPositions = positions.filter(p => p.ticker.toUpperCase() === ticker.toUpperCase()).length;
        if (sameTickerPositions > 0 && action === 'buy') {
          results.push({
            type: 'info',
            title: `Adding to existing ${ticker} position`,
            detail: `You already hold ${ticker}. Doubling down increases active risk vs ${goals.benchmark_ticker}. New weight: ${newConcentration.toFixed(1)}%.`,
          });
        }
      }
    }

    // --- 4. Diversification impact ---
    const uniqueTickers = new Set(positions.map(p => p.ticker.toUpperCase()));
    if (action === 'buy' && !uniqueTickers.has(ticker.toUpperCase())) {
      results.push({
        type: 'ok',
        title: `New position — improves diversification`,
        detail: `Portfolio will have ${uniqueTickers.size + 1} holdings (was ${uniqueTickers.size}). More names generally reduces idiosyncratic risk.`,
      });
    }

    // --- 5. Portfolio-level drawdown analysis ---
    if (action === 'buy') {
      const ddBudget = goals.max_drawdown_pct;
      const positionMap = new Map<string, number>();
      for (const p of positions) {
        const t = p.ticker.toUpperCase();
        positionMap.set(t, (positionMap.get(t) || 0) + (p.current_value || 0));
      }
      const tradeTicker = ticker.toUpperCase();
      const currentVal = positionMap.get(tradeTicker) || 0;
      positionMap.set(tradeTicker, currentVal + tradeValue);

      let totalInvested = 0;
      for (const v of positionMap.values()) totalInvested += v;

      const postCash = cashBalance - tradeValue;
      const postPortfolio = totalInvested + postCash;

      const weights: number[] = [];
      for (const v of positionMap.values()) {
        if (v > 0) weights.push(v / postPortfolio);
      }

      const hhi = weights.reduce((sum, w) => sum + w * w, 0);
      const numPositions = weights.length;
      const worstCaseDD = (totalInvested / postPortfolio) * 100;
      const avgCorr = 0.5;
      const diversificationFactor = Math.sqrt(hhi + (1 - hhi) * avgCorr);
      const estimatedDD = worstCaseDD * diversificationFactor;
      const maxWeight = Math.max(...weights);
      const largestPct = maxWeight * 100;

      if (estimatedDD > ddBudget * 1.2) {
        results.push({
          type: 'danger',
          title: `Portfolio drawdown risk ~${estimatedDD.toFixed(1)}% exceeds your ${ddBudget}% limit`,
          detail: `With ${numPositions} position${numPositions !== 1 ? 's' : ''} and ${postCash < 0 ? 'no' : `$${postCash.toFixed(0)}`} cash, ` +
            `a correlated market selloff could draw down ~${estimatedDD.toFixed(1)}% of your portfolio. ` +
            `Largest position is ${largestPct.toFixed(1)}% of portfolio. Worst-case (100% correlation): ${worstCaseDD.toFixed(1)}%.`,
        });
      } else if (estimatedDD > ddBudget * 0.8) {
        results.push({
          type: 'warning',
          title: `Portfolio drawdown risk ~${estimatedDD.toFixed(1)}% is near your ${ddBudget}% limit`,
          detail: `${numPositions} position${numPositions !== 1 ? 's' : ''}, ${((totalInvested / postPortfolio) * 100).toFixed(0)}% deployed. ` +
            `In a broad selloff, estimated drawdown is ${estimatedDD.toFixed(1)}% (worst-case: ${worstCaseDD.toFixed(1)}%). ` +
            `Consider whether additional cash buffer or diversification could reduce risk.`,
        });
      } else if (numPositions >= 2) {
        results.push({
          type: 'info',
          title: `Portfolio drawdown estimate: ~${estimatedDD.toFixed(1)}% (budget: ${ddBudget}%)`,
          detail: `${numPositions} positions across your portfolio with ${((postCash / postPortfolio) * 100).toFixed(1)}% cash. ` +
            `Diversification reduces worst-case ${worstCaseDD.toFixed(1)}% to ~${estimatedDD.toFixed(1)}%.`,
        });
      }
    }

    return results;
  }, [ticker, action, tradeValue, currentValue, cashBalance, positions, goals, instrumentType, optionType]);

  if (alerts.length === 0) return null;

  const iconMap = {
    danger: <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />,
    info: <BarChart3 className="h-3.5 w-3.5 text-blue-400 shrink-0" />,
    ok: <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />,
  };

  const bgMap = {
    danger: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
    ok: 'bg-emerald-500/10 border-emerald-500/30',
  };

  const hasDanger = alerts.some(a => a.type === 'danger');

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Pre-Trade Impact Analysis — <span className="text-primary">click alerts to learn more</span>
      </p>
      {alerts.map((alert, i) => {
        const isExpanded = expandedIndex === i;
        const topicIds = getRelevantTopics(alert.title, alert.detail, alert.type);
        const topics = topicIds.map(id => EDUCATION_TOPICS[id]).filter(Boolean);

        return (
          <div key={i} className="rounded border overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className={`flex items-start gap-2 p-2 w-full text-left text-xs transition-colors hover:brightness-110 ${bgMap[alert.type]}`}
            >
              {iconMap[alert.type]}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{alert.title}</p>
                <p className="text-muted-foreground leading-snug mt-0.5">{alert.detail}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-muted-foreground">
                {topics.length > 0 && <BookOpen className="h-3 w-3 text-primary/70" />}
                {isExpanded
                  ? <ChevronUp className="h-3 w-3" />
                  : <ChevronDown className="h-3 w-3" />
                }
              </div>
            </button>

            {isExpanded && topics.length > 0 && (
              <div className="border-t border-border/30 bg-muted/30 p-3 space-y-3">
                {topics.map(topic => (
                  <div key={topic.id} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">{topic.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {topic.explanation}
                    </p>
                    <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Lightbulb className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] font-semibold text-blue-400 uppercase">Real-World Example</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{topic.realWorldExample}</p>
                    </div>
                    <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
                      <p className="text-[11px] font-medium text-emerald-400">
                        💡 {topic.keyTakeaway}
                      </p>
                    </div>
                    {topic.relatedConcepts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground">Related:</span>
                        {topic.relatedConcepts.map(rc => {
                          const related = EDUCATION_TOPICS[rc];
                          return related ? (
                            <span key={rc} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {related.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isExpanded && topics.length === 0 && (
              <div className="border-t border-border/30 bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground italic">
                  This alert is informational. Continue to monitor this metric as you build your portfolio.
                </p>
              </div>
            )}
          </div>
        );
      })}
      {hasDanger && (
        <p className="text-[10px] text-red-400 font-medium">
          ⚠ This trade has alignment issues with your portfolio goals. You can still proceed.
        </p>
      )}
    </div>
  );
}
