import React from 'react';
import { Ban, Globe, Activity, Bitcoin, Gem } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { MultiSelectGrid, OptionCard } from '@/components/questionnaire/QuestionOptions';
import { Explainer } from '../shared/Explainer';
import type { EliteFormData } from '../EliteOnboardingPage';

const EXCLUSIONS = [
  { value: 'tobacco', label: 'Tobacco', icon: <Ban className="h-5 w-5 text-destructive" /> },
  { value: 'weapons', label: 'Weapons / Defense', icon: <Ban className="h-5 w-5 text-orange-500" /> },
  { value: 'fossil_fuels', label: 'Fossil Fuels', icon: <Ban className="h-5 w-5 text-amber-600" /> },
  { value: 'gambling', label: 'Gambling', icon: <Ban className="h-5 w-5 text-violet-500" /> },
  { value: 'alcohol', label: 'Alcohol', icon: <Ban className="h-5 w-5 text-blue-500" /> },
  { value: 'none', label: 'No Exclusions', icon: <Ban className="h-5 w-5 text-muted-foreground" /> },
];

const INTL_OPTIONS = [
  { value: 'us_only', label: 'US Only', description: 'Stick to domestic markets exclusively', emoji: '🇺🇸' },
  { value: 'developed', label: 'US + Developed Markets', description: 'Include Europe, Japan, Australia, etc.', emoji: '🌍' },
  { value: 'global', label: 'Global Including Emerging', description: 'Open to all markets including developing economies', emoji: '🌏' },
];

const VOLATILITY_OPTIONS = [
  { value: 'steady', label: 'Steady & Predictable', description: 'I prefer smaller, consistent returns over time', emoji: '📏' },
  { value: 'moderate', label: 'Some Swings OK', description: 'I can handle moderate ups and downs for better returns', emoji: '〰️' },
  { value: 'volatile', label: 'High Growth Priority', description: 'I\'m comfortable with big swings if the long-term trend is up', emoji: '🎢' },
];

const CRYPTO_OPTIONS = [
  { value: 'none', label: 'No Crypto', description: 'I don\'t want any cryptocurrency exposure', emoji: '🚫' },
  { value: 'small', label: 'Small Allocation (1-5%)', description: 'A small satellite position for diversification', emoji: '🪙' },
  { value: 'moderate', label: 'Moderate (5-15%)', description: 'I believe in crypto as an asset class', emoji: '₿' },
  { value: 'significant', label: 'Significant (15%+)', description: 'Crypto is a core part of my thesis', emoji: '🚀' },
];

const ALTERNATIVE_ASSETS = [
  { value: 'real_estate', label: 'Real Estate / REITs', icon: <Gem className="h-5 w-5 text-amber-600" /> },
  { value: 'commodities', label: 'Commodities', icon: <Gem className="h-5 w-5 text-orange-500" /> },
  { value: 'private_equity', label: 'Private Equity', icon: <Gem className="h-5 w-5 text-violet-500" /> },
  { value: 'hedge_funds', label: 'Hedge Fund Strategies', icon: <Gem className="h-5 w-5 text-blue-500" /> },
  { value: 'infrastructure', label: 'Infrastructure', icon: <Gem className="h-5 w-5 text-emerald-500" /> },
  { value: 'none', label: 'Traditional Only', icon: <Gem className="h-5 w-5 text-muted-foreground" /> },
];

interface Props {
  data: EliteFormData;
  onChange: (partial: Partial<EliteFormData>) => void;
}

export function StepPreferences({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Preferences & Values</h2>
        <p className="text-muted-foreground text-sm">
          Your values and preferences shape which investments we include — or exclude. There are no right answers here. 
          A portfolio should reflect who you are, not just what performs best on paper.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" /> Ethical Exclusions
        </Label>
        <Explainer>
          Are there any industries you want to avoid for ethical, moral, or personal reasons? We'll exclude companies 
          in these sectors from your portfolio. Research shows that ESG-screened portfolios can perform comparably to 
          unscreened ones — you're unlikely to sacrifice significant returns. Select all that apply, or choose "No Exclusions."
        </Explainer>
        <MultiSelectGrid
          options={EXCLUSIONS}
          selected={data.ethicalExclusions}
          onChange={(exclusions) => onChange({ ethicalExclusions: exclusions })}
          columns={3}
        />
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> International Investment Comfort
        </Label>
        <Explainer>
          International diversification reduces risk by spreading investments across different economies. The US represents 
          about 60% of global market cap — the other 40% offers exposure to different growth drivers, currency regimes, 
          and valuation opportunities. However, it introduces currency risk and political risk. Your comfort level 
          helps us set the right geographic balance.
        </Explainer>
        <div className="grid gap-2">
          {INTL_OPTIONS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.internationalPreference === o.value} onClick={() => onChange({ internationalPreference: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Volatility Preference
        </Label>
        <Explainer>
          This is about your emotional comfort with portfolio swings. Even if you can financially afford losses, 
          some people lose sleep over seeing red numbers. The 2022 bear market saw many investors who thought they 
          were aggressive panic-sell at the bottom. Be honest about your actual comfort — there's no wrong answer, 
          but the wrong portfolio for your personality will lead to poor decisions.
        </Explainer>
        <div className="grid gap-2">
          {VOLATILITY_OPTIONS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.volatilityPreference === o.value} onClick={() => onChange({ volatilityPreference: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Bitcoin className="h-4 w-4 text-primary" /> Cryptocurrency Stance
        </Label>
        <Explainer>
          Crypto assets are highly volatile but can provide uncorrelated returns and potential inflation hedging. 
          Bitcoin has had drawdowns exceeding 70% multiple times but has also delivered extraordinary long-term returns. 
          Your stance helps us decide whether to include Bitcoin, Ethereum, or crypto-adjacent ETFs in your allocation. 
          Even a small 1-5% allocation can meaningfully impact portfolio diversification.
        </Explainer>
        <div className="grid gap-2">
          {CRYPTO_OPTIONS.map(o => (
            <OptionCard key={o.value} label={o.label} description={o.description} emoji={o.emoji}
              selected={data.cryptoStance === o.value} onClick={() => onChange({ cryptoStance: o.value })} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-primary" /> Alternative Asset Interest
        </Label>
        <Explainer>
          Alternative assets — like real estate, commodities, and private equity — can provide diversification benefits 
          beyond traditional stocks and bonds. They often have low correlation to public markets, which smooths overall 
          portfolio returns. However, many alternatives come with higher fees, lower liquidity, and more complexity. 
          Select any categories you're interested in exploring.
        </Explainer>
        <MultiSelectGrid
          options={ALTERNATIVE_ASSETS}
          selected={data.alternativeInterest}
          onChange={(alts) => onChange({ alternativeInterest: alts })}
          columns={3}
        />
      </div>
    </div>
  );
}
