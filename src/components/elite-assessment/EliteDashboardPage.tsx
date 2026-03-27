import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, TrendingUp, Activity, Grid3X3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/shared/PageLoader';
import { PortfolioBacktestChart } from './dashboard/PortfolioBacktestChart';
import { OptionsPositionTable } from './dashboard/OptionsPositionTable';
import { CorrelationMatrix } from './dashboard/CorrelationMatrix';

interface EliteProfile {
  capital_allocated: number;
  primary_objective: string;
  max_drawdown_tolerance: number;
  market_fears: string[];
  target_return_risk: string;
  options_approval: string;
}

// Map objectives to portfolio tickers/weights
function getPortfolioAllocation(profile: EliteProfile) {
  switch (profile.primary_objective) {
    case 'aggressive_growth':
      return { tickers: ['SPY', 'QQQ', 'ARKK', 'GLD'], weights: [0.35, 0.35, 0.2, 0.1], label: 'Aggressive Growth Blend' };
    case 'hedging':
      return { tickers: ['SPY', 'TLT', 'GLD', 'UUP'], weights: [0.3, 0.3, 0.25, 0.15], label: 'Hedged Portfolio' };
    case 'income':
      return { tickers: ['SCHD', 'VYM', 'TLT', 'HYG'], weights: [0.3, 0.3, 0.2, 0.2], label: 'Income Portfolio' };
    case 'uncorrelated_return':
      return { tickers: ['DBMF', 'GLD', 'TLT', 'SPY'], weights: [0.3, 0.3, 0.25, 0.15], label: 'Uncorrelated Returns' };
    default:
      return { tickers: ['SPY', 'QQQ', 'TLT', 'GLD'], weights: [0.3, 0.3, 0.2, 0.2], label: 'Balanced' };
  }
}

export default function EliteDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EliteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [marketValue, setMarketValue] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('elite_client_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !data) {
        navigate('/elite-onboarding');
        return;
      }
      setProfile(data as any);
      setLoading(false);
    })();
  }, [user, navigate]);

  if (loading || !profile) return <PageLoader />;

  const allocation = getPortfolioAllocation(profile);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Ribbon */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Elite Dashboard</h1>
              <p className="text-xs text-muted-foreground">{allocation.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Capital Allocated</p>
              <p className="text-xl font-bold text-foreground">
                ${profile.capital_allocated.toLocaleString()}
              </p>
            </div>
            {marketValue !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Simulated Value</p>
                <p className={`text-xl font-bold ${marketValue >= profile.capital_allocated ? 'text-emerald-500' : 'text-destructive'}`}>
                  ${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Portfolio Backtest */}
        <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Portfolio Allocation Backtest</h2>
          </div>
          <PortfolioBacktestChart
            tickers={allocation.tickers}
            weights={allocation.weights}
            capitalAllocated={profile.capital_allocated}
            onMarketValueUpdate={setMarketValue}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Options Position */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Options Position Pricing</h2>
            </div>
            <OptionsPositionTable
              optionsApproval={profile.options_approval}
            />
          </section>

          {/* Correlation Matrix */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">30-Day Correlation Matrix</h2>
            </div>
            <CorrelationMatrix tickers={allocation.tickers} />
          </section>
        </div>
      </div>
    </div>
  );
}
