import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileField {
  label: string;
  value: string | number | boolean | string[] | null | undefined;
}

const FIELD_LABELS: Record<string, string> = {
  liquid_net_worth: 'Liquid Net Worth',
  capital_allocated: 'Capital Allocated',
  primary_objective: 'Primary Objective',
  is_non_us_accredited: 'Non-US Accredited',
  max_drawdown_tolerance: 'Max Drawdown Tolerance',
  market_fears: 'Market Fears',
  target_return_risk: 'Target Return / Risk',
  options_approval: 'Options Approval',
  rebalancing_frequency: 'Rebalancing Frequency',
  investment_purpose: 'Investment Purpose',
  time_horizon: 'Time Horizon',
  goal_priority: 'Goal Priority',
  loss_reaction: 'Loss Reaction',
  regret_preference: 'Regret Preference',
  experience_level: 'Experience Level',
  other_accounts: 'Other Accounts',
  other_accounts_value: 'Other Accounts Value',
  current_asset_mix: 'Current Asset Mix',
  has_concentrated_positions: 'Concentrated Positions',
  other_options_experience: 'Options Experience',
  ethical_exclusions: 'Ethical Exclusions',
  international_preference: 'International Preference',
  volatility_preference: 'Volatility Preference',
  crypto_stance: 'Crypto Stance',
};

const DISPLAY_ORDER = [
  'liquid_net_worth', 'capital_allocated', 'primary_objective', 'is_non_us_accredited',
  'investment_purpose', 'time_horizon', 'goal_priority',
  'max_drawdown_tolerance', 'market_fears', 'target_return_risk', 'loss_reaction', 'regret_preference', 'experience_level',
  'other_accounts', 'other_accounts_value', 'current_asset_mix', 'has_concentrated_positions', 'other_options_experience',
  'ethical_exclusions', 'international_preference', 'volatility_preference', 'crypto_stance',
  'options_approval', 'rebalancing_frequency',
];

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length > 0 ? val.map(v => v.replace(/_/g, ' ')).join(', ') : '—';
  if (key.includes('worth') || key.includes('value') || key.includes('allocated')) {
    return `$${Number(val).toLocaleString()}`;
  }
  if (key.includes('drawdown')) return `${val}%`;
  return String(val).replace(/_/g, ' ');
}

interface EliteProfileViewerProps {
  profile: Record<string, any>;
  maxHeight?: string;
}

export function EliteProfileViewer({ profile, maxHeight = '500px' }: EliteProfileViewerProps) {
  const fields = DISPLAY_ORDER.filter(k => k in profile);

  return (
    <ScrollArea className={`max-h-[${maxHeight}]`} style={{ maxHeight }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
        {fields.map(key => (
          <div key={key} className="p-3 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-0.5">{FIELD_LABELS[key] || key}</p>
            <p className="text-sm font-medium text-foreground capitalize">{formatValue(key, profile[key])}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
