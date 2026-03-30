import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, BarChart3, ShieldAlert } from 'lucide-react';

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
  const alerts = useMemo(() => {
    if (!tradeValue || tradeValue <= 0 || !goals) return [];

    const results: Alert[] = [];
    const totalPortfolio = currentValue;
    if (totalPortfolio <= 0) return [];

    const postTradePortfolio = action === 'buy'
      ? totalPortfolio // value stays same, cash→position
      : totalPortfolio; // sell: position→cash

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

      if (postCashPct < 5) {
        results.push({
          type: 'warning',
          title: `Cash drops below 5% — limited flexibility`,
          detail: `Only $${postCash.toFixed(0)} (${postCashPct.toFixed(1)}%) left for opportunities or margin of safety.`,
        });
      }
    }

    // --- 3. Goal alignment check ---
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
      // Check if adding more of same sector increases tracking error
      const sameTickerPositions = positions.filter(p => p.ticker.toUpperCase() === ticker.toUpperCase()).length;
      if (sameTickerPositions > 0 && action === 'buy') {
        results.push({
          type: 'info',
          title: `Adding to existing ${ticker} position`,
          detail: `You already hold ${ticker}. Doubling down increases active risk vs ${goals.benchmark_ticker}. New weight: ${newConcentration.toFixed(1)}%.`,
        });
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

    // --- 5. Position size relative to drawdown constraint ---
    if (action === 'buy') {
      const maxLoss = tradeValue; // worst case for stocks/options
      const maxLossPct = (maxLoss / totalPortfolio) * 100;
      const ddBudget = goals.max_drawdown_pct;

      if (maxLossPct > ddBudget * 0.5) {
        results.push({
          type: 'danger',
          title: `Worst-case loss (${maxLossPct.toFixed(1)}%) uses >${(ddBudget * 0.5).toFixed(0)}% of drawdown budget`,
          detail: `If ${ticker} went to zero, you'd lose ${maxLossPct.toFixed(1)}% — more than half your ${ddBudget}% max drawdown tolerance.`,
        });
      } else if (maxLossPct > ddBudget * 0.25) {
        results.push({
          type: 'warning',
          title: `Worst-case loss uses ${((maxLossPct / ddBudget) * 100).toFixed(0)}% of drawdown budget`,
          detail: `Total loss scenario: -${maxLossPct.toFixed(1)}% of portfolio vs ${ddBudget}% max drawdown tolerance.`,
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
        Pre-Trade Impact Analysis
      </p>
      {alerts.map((alert, i) => (
        <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${bgMap[alert.type]}`}>
          {iconMap[alert.type]}
          <div className="min-w-0">
            <p className="font-medium leading-tight">{alert.title}</p>
            <p className="text-muted-foreground leading-snug mt-0.5">{alert.detail}</p>
          </div>
        </div>
      ))}
      {hasDanger && (
        <p className="text-[10px] text-red-400 font-medium">
          ⚠ This trade has alignment issues with your portfolio goals. You can still proceed.
        </p>
      )}
    </div>
  );
}
