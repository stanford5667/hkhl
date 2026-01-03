// Investor Profile Component - Captures Basel-compliant investor constraints
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  InvestorProfile, 
  LiquidityConstraint, 
  AssetClass,
  JPMORGAN_DEFAULTS 
} from '@/types/portfolio';
import { 
  DollarSign, 
  Clock, 
  Briefcase, 
  Shield,
  TrendingUp,
  Coins,
  Building2,
  BarChart3
} from 'lucide-react';

interface InvestorProfileFormProps {
  profile: InvestorProfile;
  onProfileChange: (profile: InvestorProfile) => void;
}

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'stocks', label: 'Stocks', icon: TrendingUp, description: 'Individual equities (AAPL, MSFT...)' },
  { value: 'etfs', label: 'ETFs', icon: BarChart3, description: 'Index funds (SPY, QQQ...)' },
  { value: 'bonds', label: 'Bonds', icon: Shield, description: 'Fixed income (TLT, BND...)' },
  { value: 'crypto', label: 'Crypto', icon: Coins, description: 'Digital assets (BITO, GBTC...)' },
  { value: 'commodities', label: 'Commodities', icon: Briefcase, description: 'Gold, Oil (GLD, DBC...)' },
  { value: 'real_estate', label: 'Real Estate', icon: Building2, description: 'REITs (VNQ, XLRE...)' },
];

export function InvestorProfileForm({ profile, onProfileChange }: InvestorProfileFormProps) {
  const updateProfile = (updates: Partial<InvestorProfile>) => {
    onProfileChange({ ...profile, ...updates });
  };

  const toggleAssetClass = (assetClass: AssetClass) => {
    const current = profile.assetUniverse;
    const updated = current.includes(assetClass)
      ? current.filter(a => a !== assetClass)
      : [...current, assetClass];
    updateProfile({ assetUniverse: updated });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="space-y-6">
      {/* Investable Capital */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Investable Capital
          </CardTitle>
          <CardDescription>Total amount available for investment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={profile.investableCapital}
                  onChange={(e) => updateProfile({ investableCapital: Math.max(0, Number(e.target.value)) })}
                  className="pl-7 text-lg font-semibold"
                  min={0}
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {formatCurrency(profile.investableCapital)}
              </Badge>
            </div>
            <div className="flex gap-2">
              {[10000, 50000, 100000, 500000, 1000000].map(amount => (
                <button
                  key={amount}
                  onClick={() => updateProfile({ investableCapital: amount })}
                  className="px-3 py-1 text-xs rounded-full border border-border hover:bg-muted transition-colors"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Constraints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Liquidity Constraints
          </CardTitle>
          <CardDescription>How quickly do you need access to your capital?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={profile.liquidityConstraint}
            onValueChange={(value: LiquidityConstraint) => updateProfile({ liquidityConstraint: value })}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="high" id="liquidity-high" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="liquidity-high" className="font-medium cursor-pointer">
                  High Liquidity
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Need access to cash within 30 days. Limits exposure to illiquid assets.
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                Conservative
              </Badge>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="locked" id="liquidity-locked" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="liquidity-locked" className="font-medium cursor-pointer">
                  Locked Capital
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Can hold long-term assets for 3+ years. Allows private equity, illiquid alternatives.
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                Aggressive
              </Badge>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Asset Universe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-500" />
            Asset Universe
          </CardTitle>
          <CardDescription>
            Select asset classes to include. JP Morgan 60/40+ suggests ~30% in alternatives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ASSET_CLASS_OPTIONS.map(({ value, label, icon: Icon, description }) => {
              const isSelected = profile.assetUniverse.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleAssetClass(value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </button>
              );
            })}
          </div>
          
          {/* JP Morgan 60/40+ indicator */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Alternative Allocation</span>
              <Badge variant={
                profile.assetUniverse.filter(a => ['crypto', 'commodities', 'real_estate'].includes(a)).length >= 2
                  ? 'default'
                  : 'secondary'
              }>
                {profile.assetUniverse.filter(a => ['crypto', 'commodities', 'real_estate'].includes(a)).length >= 2
                  ? '60/40+ Aligned'
                  : 'Add Alternatives'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Including alternatives can improve Sharpe ratio by ~{(JPMORGAN_DEFAULTS.expectedSharpeImprovement * 100).toFixed(0)}% vs traditional 60/40
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Tolerance Slider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-rose-500" />
            Risk Tolerance
          </CardTitle>
          <CardDescription>Your comfort level with portfolio volatility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conservative</span>
              <span className="text-lg font-bold">{profile.riskTolerance}%</span>
              <span className="text-sm text-muted-foreground">Aggressive</span>
            </div>
            <Slider
              value={[profile.riskTolerance]}
              onValueChange={([value]) => updateProfile({ riskTolerance: value })}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lower volatility, lower returns</span>
              <span>Higher volatility, higher returns</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Horizon */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-500" />
            Investment Horizon
          </CardTitle>
          <CardDescription>How long do you plan to hold this portfolio?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={profile.investmentHorizon}
              onChange={(e) => updateProfile({ investmentHorizon: Math.max(1, Number(e.target.value)) })}
              min={1}
              max={30}
              className="w-24"
            />
            <span className="text-muted-foreground">years</span>
          </div>
          <div className="flex gap-2 mt-3">
            {[1, 3, 5, 10, 20].map(years => (
              <button
                key={years}
                onClick={() => updateProfile({ investmentHorizon: years })}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  profile.investmentHorizon === years
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {years}Y
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
