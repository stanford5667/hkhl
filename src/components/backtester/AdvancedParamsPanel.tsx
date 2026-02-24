/**
 * Advanced Parameters Panel
 * 
 * Collapsible accordion of Entry, Exit, Execution Realism, and Capital & Sizing controls.
 * Matches the Bloomberg terminal dark aesthetic.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  Crosshair,
  LogOut,
  Gauge,
  Wallet,
  Info,
  AlertTriangle,
  Plus,
  Trash2,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvancedBacktestParams } from '@/lib/backtesting/types';
import {
  DEFAULT_ADVANCED_PARAMS,
  ADVANCED_PARAM_PRESETS,
} from '@/lib/backtesting/types';

interface AdvancedParamsPanelProps {
  params: AdvancedBacktestParams;
  onChange: (params: AdvancedBacktestParams) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  color,
  open,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  open: boolean;
}) {
  return (
    <div className="flex items-center justify-between w-full py-3 px-4">
      <div className="flex items-center gap-2">
        <div className={cn('w-1 h-6 rounded-full', color)} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold font-mono uppercase tracking-wider">
          {label}
        </span>
      </div>
      <ChevronDown
        className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200',
          open && 'rotate-180'
        )}
      />
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-md border border-border/40 bg-muted/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-mono rounded-sm transition-all',
            value === o.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs text-muted-foreground font-mono">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = min ?? 0;
            if (min !== undefined) v = Math.max(min, v);
            if (max !== undefined) v = Math.min(max, v);
            onChange(v);
          }}
          min={min}
          max={max}
          step={step}
          className="h-8 font-mono text-xs"
        />
        {suffix && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AdvancedParamsPanel({ params, onChange }: AdvancedParamsPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    entry: false,
    exit: false,
    realism: false,
    sizing: false,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const set = <K extends keyof AdvancedBacktestParams>(
    key: K,
    value: AdvancedBacktestParams[K]
  ) => onChange({ ...params, [key]: value });

  const applyPreset = (presetKey: string) => {
    const preset = ADVANCED_PARAM_PRESETS[presetKey];
    if (!preset) return;
    onChange({ ...DEFAULT_ADVANCED_PARAMS, ...preset.params });
  };

  // Config summary
  const configSummary = useMemo(() => {
    const parts: string[] = [];

    // Entry
    const entryLabels: Record<string, string> = {
      market: 'Market order at next bar open',
      limit: `Limit order (${params.entryLimitOffset ?? 1}% offset)`,
      stop: `Stop order (${params.entryStopOffset ?? 1}% offset)`,
      'stop-limit': `Stop-limit order`,
    };
    parts.push(`Entry: ${entryLabels[params.entryOrderType]}`);

    // Exit
    const exitParts: string[] = [];
    if (params.takeProfitEnabled) {
      let tp = `TP at +${params.takeProfitValue}%`;
      if (params.takeProfitPartial)
        tp += ` (${params.takeProfitPartialPercent}% partial)`;
      exitParts.push(tp);
    }
    if (params.trailingStopEnabled) {
      exitParts.push(`trail ${params.trailingStopPercent}%`);
    }
    if (params.stopLossEnabled) {
      exitParts.push(`SL at -${params.stopLossValue}%`);
    }
    if (params.timeExitEnabled) {
      exitParts.push(`time exit ${params.timeExitBars} bars`);
    }
    if (exitParts.length) parts.push(`Exit: ${exitParts.join(', ')}`);

    // Commission
    const commLabels: Record<string, string> = {
      percent: `${params.commissionValue}% per trade`,
      'fixed-per-order': `$${params.commissionValue}/order`,
      'fixed-per-contract': `$${params.commissionValue}/contract`,
    };
    parts.push(`Commission: ${commLabels[params.commissionType]}`);

    // Sizing
    const sizeLabels: Record<string, string> = {
      'percent-equity': `${params.positionSizingValue}% of equity`,
      'fixed-dollar': `$${params.positionSizingValue} per trade`,
      'fixed-shares': `${params.positionSizingValue} shares`,
      'risk-based': `${params.positionSizingValue}% risk-based`,
    };
    parts.push(`Position: ${sizeLabels[params.positionSizingMethod]}`);

    return parts.join(' · ');
  }, [params]);

  // Warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (
      params.positionSizingMethod === 'risk-based' &&
      !params.stopLossEnabled
    ) {
      w.push('Risk-based sizing requires a stop loss to calculate position size');
    }
    if (params.executeOnBarClose) {
      w.push(
        'Executing on bar close can introduce lookahead bias — results may be more optimistic'
      );
    }
    const tierTotal = params.exitTiers.reduce((s, t) => s + t.closePercent, 0);
    if (tierTotal > 100) {
      w.push('Total exit tier quantity exceeds 100% of position');
    }
    return w;
  }, [params]);

  const isIdealized =
    params.commissionValue === 0 && params.slippageTicks === 0;

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Presets:
        </span>
        {Object.entries(ADVANCED_PARAM_PRESETS).map(([key, preset]) => {
          const icons: Record<string, React.ElementType> = {
            realistic: Gauge,
            conservative: Shield,
            aggressive: TrendingUp,
          };
          const Icon = icons[key] || Zap;
          return (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(key)}
              className="h-7 text-xs font-mono gap-1.5"
            >
              <Icon className="h-3 w-3" />
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* ── Section 1: Entry Execution ──────────────────────────── */}
      <Collapsible
        open={openSections.entry}
        onOpenChange={() => toggle('entry')}
      >
        <Card className="bg-card/80 backdrop-blur-xl border-border/40 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              icon={Crosshair}
              label="Entry Execution"
              color="bg-blue-400"
              open={openSections.entry}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">
                  Order Type
                </Label>
                <SegmentedControl
                  options={[
                    { value: 'market', label: 'Market' },
                    { value: 'limit', label: 'Limit' },
                    { value: 'stop', label: 'Stop' },
                    { value: 'stop-limit', label: 'Stop-Limit' },
                  ]}
                  value={params.entryOrderType}
                  onChange={(v) =>
                    set(
                      'entryOrderType',
                      v as AdvancedBacktestParams['entryOrderType']
                    )
                  }
                />
                <p className="text-[10px] text-muted-foreground/60 font-mono">
                  {params.entryOrderType === 'market' &&
                    'Fills at next bar open price'}
                  {params.entryOrderType === 'limit' &&
                    'Fills only if price reaches the specified level'}
                  {params.entryOrderType === 'stop' &&
                    'Triggers when price breaks above entry level'}
                  {params.entryOrderType === 'stop-limit' &&
                    'Stop triggers first, then limit order placed'}
                </p>
              </div>

              {(params.entryOrderType === 'limit' ||
                params.entryOrderType === 'stop-limit') && (
                <NumberField
                  label="Limit Offset (% below price)"
                  value={params.entryLimitOffset ?? 1}
                  onChange={(v) => set('entryLimitOffset', v)}
                  min={0.1}
                  max={5}
                  step={0.1}
                  suffix="%"
                />
              )}

              {(params.entryOrderType === 'stop' ||
                params.entryOrderType === 'stop-limit') && (
                <NumberField
                  label="Stop Offset (% above price)"
                  value={params.entryStopOffset ?? 1}
                  onChange={(v) => set('entryStopOffset', v)}
                  min={0.1}
                  max={5}
                  step={0.1}
                  suffix="%"
                />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-mono">
                    Require price to exceed limit
                  </Label>
                  <InfoTip text="When on, limit orders only fill if price moves past the limit level by at least 1 tick" />
                </div>
                <Switch
                  checked={params.requireExceedLimit}
                  onCheckedChange={(v) => set('requireExceedLimit', v)}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Section 2: Exit Strategy ───────────────────────────── */}
      <Collapsible open={openSections.exit} onOpenChange={() => toggle('exit')}>
        <Card className="bg-card/80 backdrop-blur-xl border-border/40 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              icon={LogOut}
              label="Exit Strategy"
              color="bg-emerald-400"
              open={openSections.exit}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-5">
              {/* 2a Take Profit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono font-semibold text-emerald-400">
                    TAKE PROFIT
                  </Label>
                  <Switch
                    checked={params.takeProfitEnabled}
                    onCheckedChange={(v) => set('takeProfitEnabled', v)}
                  />
                </div>
                {params.takeProfitEnabled && (
                  <div className="pl-3 border-l border-emerald-400/30 space-y-3">
                    <SegmentedControl
                      options={[
                        { value: 'percent', label: '% Gain' },
                        { value: 'fixed', label: 'Absolute' },
                      ]}
                      value={params.takeProfitType}
                      onChange={(v) =>
                        set(
                          'takeProfitType',
                          v as 'percent' | 'fixed'
                        )
                      }
                    />
                    <NumberField
                      label={
                        params.takeProfitType === 'percent'
                          ? 'Take profit at +X%'
                          : 'Take profit price ($)'
                      }
                      value={params.takeProfitValue}
                      onChange={(v) => set('takeProfitValue', v)}
                      min={0.1}
                      step={0.5}
                      suffix={params.takeProfitType === 'percent' ? '%' : '$'}
                    />
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono">Partial exit</Label>
                      <Switch
                        checked={params.takeProfitPartial}
                        onCheckedChange={(v) => set('takeProfitPartial', v)}
                      />
                    </div>
                    {params.takeProfitPartial && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-mono">
                          Close {params.takeProfitPartialPercent}% at take profit
                        </Label>
                        <Slider
                          value={[params.takeProfitPartialPercent]}
                          onValueChange={([v]) =>
                            set('takeProfitPartialPercent', v)
                          }
                          min={10}
                          max={100}
                          step={5}
                        />
                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                          Remaining position continues with trailing stop
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* 2b Stop Loss */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono font-semibold text-rose-400">
                    STOP LOSS
                  </Label>
                  <Switch
                    checked={params.stopLossEnabled}
                    onCheckedChange={(v) => set('stopLossEnabled', v)}
                  />
                </div>
                {params.stopLossEnabled && (
                  <div className="pl-3 border-l border-rose-400/30 space-y-3">
                    <SegmentedControl
                      options={[
                        { value: 'percent', label: '% Loss' },
                        { value: 'fixed', label: 'Fixed $' },
                        { value: 'atr', label: 'ATR-Based' },
                      ]}
                      value={params.stopLossType}
                      onChange={(v) =>
                        set(
                          'stopLossType',
                          v as 'percent' | 'fixed' | 'atr'
                        )
                      }
                    />
                    {params.stopLossType === 'atr' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField
                          label="ATR Multiplier"
                          value={params.stopLossValue}
                          onChange={(v) => set('stopLossValue', v)}
                          min={0.5}
                          max={5}
                          step={0.5}
                          suffix="x"
                        />
                        <NumberField
                          label="ATR Period"
                          value={params.stopLossAtrPeriod ?? 14}
                          onChange={(v) => set('stopLossAtrPeriod', v)}
                          min={5}
                          max={30}
                          suffix="bars"
                        />
                      </div>
                    ) : (
                      <NumberField
                        label={
                          params.stopLossType === 'percent'
                            ? 'Stop loss at -X%'
                            : 'Stop price ($)'
                        }
                        value={params.stopLossValue}
                        onChange={(v) => set('stopLossValue', v)}
                        min={0.1}
                        step={0.5}
                        suffix={params.stopLossType === 'percent' ? '%' : '$'}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-mono">Break-even stop</Label>
                        <InfoTip text="Move stop to entry price after reaching a profit threshold" />
                      </div>
                      <Switch
                        checked={params.breakEvenEnabled}
                        onCheckedChange={(v) => set('breakEvenEnabled', v)}
                      />
                    </div>
                    {params.breakEvenEnabled && (
                      <NumberField
                        label="Activate after +X% gain"
                        value={params.breakEvenTrigger ?? 3}
                        onChange={(v) => set('breakEvenTrigger', v)}
                        min={1}
                        max={20}
                        step={0.5}
                        suffix="%"
                      />
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* 2c Trailing Stop */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono font-semibold text-amber-400">
                    TRAILING STOP
                  </Label>
                  <Switch
                    checked={params.trailingStopEnabled}
                    onCheckedChange={(v) => set('trailingStopEnabled', v)}
                  />
                </div>
                {params.trailingStopEnabled && (
                  <div className="pl-3 border-l border-amber-400/30 space-y-3">
                    <NumberField
                      label="Trail distance"
                      value={params.trailingStopPercent}
                      onChange={(v) => set('trailingStopPercent', v)}
                      min={0.5}
                      max={20}
                      step={0.5}
                      suffix="%"
                    />
                    <SegmentedControl
                      options={[
                        { value: 'immediate', label: 'Immediate' },
                        { value: 'after-profit', label: 'After Profit' },
                      ]}
                      value={params.trailingStopActivation}
                      onChange={(v) =>
                        set(
                          'trailingStopActivation',
                          v as 'immediate' | 'after-profit'
                        )
                      }
                    />
                    {params.trailingStopActivation === 'after-profit' && (
                      <NumberField
                        label="Activate after +X% gain"
                        value={params.trailingStopActivationPercent ?? 3}
                        onChange={(v) =>
                          set('trailingStopActivationPercent', v)
                        }
                        min={0.5}
                        max={15}
                        step={0.5}
                        suffix="%"
                      />
                    )}
                    {/* Mini visual diagram */}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
                      <span className="text-primary">Entry</span>
                      <span>→</span>
                      <span className="text-emerald-400">+Profit</span>
                      <span>→</span>
                      <span className="text-amber-400">Trail ↑</span>
                      <span>→</span>
                      <span className="text-rose-400">Exit</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* 2d Time Exit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono font-semibold text-muted-foreground">
                    TIME EXIT
                  </Label>
                  <Switch
                    checked={params.timeExitEnabled}
                    onCheckedChange={(v) => set('timeExitEnabled', v)}
                  />
                </div>
                {params.timeExitEnabled && (
                  <div className="pl-3 border-l border-border/40 space-y-3">
                    <NumberField
                      label="Exit after X bars"
                      value={params.timeExitBars ?? 10}
                      onChange={(v) => set('timeExitBars', v)}
                      min={1}
                      max={120}
                      suffix="bars"
                    />
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono">
                        Exit at session close
                      </Label>
                      <Switch
                        checked={params.timeExitOnSessionClose}
                        onCheckedChange={(v) =>
                          set('timeExitOnSessionClose', v)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* 2e Scaled / Partial Exit Tiers */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3 w-3" />
                  Add exit tiers (scale out)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {params.exitTiers.map((tier, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <NumberField
                        label={`At +%`}
                        value={tier.profitPercent}
                        onChange={(v) => {
                          const tiers = [...params.exitTiers];
                          tiers[i] = { ...tiers[i], profitPercent: v };
                          set('exitTiers', tiers);
                        }}
                        min={0.5}
                        step={0.5}
                        suffix="%"
                        className="flex-1"
                      />
                      <NumberField
                        label="Close %"
                        value={tier.closePercent}
                        onChange={(v) => {
                          const tiers = [...params.exitTiers];
                          tiers[i] = { ...tiers[i], closePercent: v };
                          set('exitTiers', tiers);
                        }}
                        min={5}
                        max={100}
                        step={5}
                        suffix="%"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          set(
                            'exitTiers',
                            params.exitTiers.filter((_, idx) => idx !== i)
                          );
                        }}
                        className="h-8 px-2 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {params.exitTiers.length < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-mono"
                      onClick={() =>
                        set('exitTiers', [
                          ...params.exitTiers,
                          { profitPercent: 5, closePercent: 33 },
                        ])
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tier
                    </Button>
                  )}
                  {params.exitTiers.reduce((s, t) => s + t.closePercent, 0) >
                    100 && (
                    <p className="text-[10px] text-rose-400 font-mono">
                      ⚠ Total exit quantity exceeds position size
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Section 3: Execution Realism ───────────────────────── */}
      <Collapsible
        open={openSections.realism}
        onOpenChange={() => toggle('realism')}
      >
        <Card className="bg-card/80 backdrop-blur-xl border-border/40 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 rounded-full bg-amber-400" />
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold font-mono uppercase tracking-wider">
                  Execution Realism
                </span>
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    isIdealized
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  )}
                >
                  {isIdealized ? 'IDEALIZED' : 'REALISTIC'}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  openSections.realism && 'rotate-180'
                )}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Commission */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">
                  Commission Type
                </Label>
                <Select
                  value={params.commissionType}
                  onValueChange={(v) =>
                    set(
                      'commissionType',
                      v as AdvancedBacktestParams['commissionType']
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">% of trade value</SelectItem>
                    <SelectItem value="fixed-per-order">
                      Fixed per order
                    </SelectItem>
                    <SelectItem value="fixed-per-contract">
                      Fixed per contract
                    </SelectItem>
                  </SelectContent>
                </Select>
                <NumberField
                  label="Commission Value"
                  value={params.commissionValue}
                  onChange={(v) => set('commissionValue', v)}
                  min={0}
                  step={0.01}
                  suffix={params.commissionType === 'percent' ? '%' : '$'}
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'Crypto (0.1%)', type: 'percent' as const, val: 0.1 },
                    { label: 'US Stocks ($0.005)', type: 'fixed-per-contract' as const, val: 0.005 },
                    { label: 'Free (0%)', type: 'percent' as const, val: 0 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        set('commissionType', chip.type);
                        set('commissionValue', chip.val);
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Slippage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-mono">
                    Slippage
                  </Label>
                  <InfoTip text="Added to market/stop order fill prices. Accounts for bid-ask spread and execution delay." />
                </div>
                <div className="space-y-1">
                  <Slider
                    value={[params.slippageTicks]}
                    onValueChange={([v]) => set('slippageTicks', v)}
                    min={0}
                    max={20}
                    step={1}
                  />
                  <p className="text-[10px] text-muted-foreground font-mono text-right">
                    {params.slippageTicks} ticks
                  </p>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Bar Close Execution */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">
                    Execute on bar close
                  </Label>
                  <Switch
                    checked={params.executeOnBarClose}
                    onCheckedChange={(v) => set('executeOnBarClose', v)}
                  />
                </div>
                {params.executeOnBarClose && (
                  <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-400 font-mono">
                      This can introduce lookahead bias — results may be more
                      optimistic than live trading
                    </p>
                  </div>
                )}
              </div>

              {/* Bar Magnifier */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-mono">Bar magnifier</Label>
                  <InfoTip text="Uses lower timeframe data within each bar for more realistic stop/limit order fills" />
                </div>
                <Switch
                  checked={params.useBarMagnifier}
                  onCheckedChange={(v) => set('useBarMagnifier', v)}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Section 4: Capital & Sizing ─────────────────────────── */}
      <Collapsible
        open={openSections.sizing}
        onOpenChange={() => toggle('sizing')}
      >
        <Card className="bg-card/80 backdrop-blur-xl border-border/40 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              icon={Wallet}
              label="Capital & Sizing"
              color="bg-violet-400"
              open={openSections.sizing}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Position Sizing Method */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">
                  Position Sizing Method
                </Label>
                <SegmentedControl
                  options={[
                    { value: 'percent-equity', label: '% Equity' },
                    { value: 'fixed-dollar', label: 'Fixed $' },
                    { value: 'fixed-shares', label: 'Shares' },
                    { value: 'risk-based', label: 'Risk %' },
                  ]}
                  value={params.positionSizingMethod}
                  onChange={(v) =>
                    set(
                      'positionSizingMethod',
                      v as AdvancedBacktestParams['positionSizingMethod']
                    )
                  }
                />
                <NumberField
                  label={
                    {
                      'percent-equity': 'Allocate X% of account per trade',
                      'fixed-dollar': 'Invest $X per trade',
                      'fixed-shares': 'Buy X shares per trade',
                      'risk-based': 'Risk X% of account per trade',
                    }[params.positionSizingMethod]
                  }
                  value={params.positionSizingValue}
                  onChange={(v) => set('positionSizingValue', v)}
                  min={1}
                  step={1}
                  suffix={
                    params.positionSizingMethod === 'fixed-dollar'
                      ? '$'
                      : params.positionSizingMethod === 'fixed-shares'
                      ? 'shares'
                      : '%'
                  }
                />
                {params.positionSizingMethod === 'risk-based' && (
                  <p className="text-[10px] text-muted-foreground/60 font-mono">
                    Position size = (Account × Risk%) ÷ Stop distance
                  </p>
                )}
                {params.positionSizingMethod === 'risk-based' &&
                  !params.stopLossEnabled && (
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 font-mono">
                        Risk-based sizing requires a stop loss
                      </p>
                    </div>
                  )}
              </div>

              <Separator className="bg-border/30" />

              {/* Pyramiding */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-mono">
                    Pyramiding
                  </Label>
                  <InfoTip text="Allows adding to a winning position. Set to 1 to disable pyramiding." />
                </div>
                <div className="space-y-1">
                  <Slider
                    value={[params.pyramiding]}
                    onValueChange={([v]) => set('pyramiding', v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <p className="text-[10px] text-muted-foreground font-mono text-right">
                    {params.pyramiding} max entries
                  </p>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Margin */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground font-mono">
                  Margin
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Long margin %"
                    value={params.marginLong}
                    onChange={(v) => set('marginLong', v)}
                    min={10}
                    max={100}
                    suffix="%"
                  />
                  <NumberField
                    label="Short margin %"
                    value={params.marginShort}
                    onChange={(v) => set('marginShort', v)}
                    min={10}
                    max={100}
                    suffix="%"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-mono">
                  25% margin = 4× leverage. 100% = no leverage.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Config Summary ─────────────────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/30">
        <CardContent className="py-3 px-4">
          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
            {configSummary}
          </p>
          {warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-400 font-mono flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  {w}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
