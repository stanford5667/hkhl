/**
 * Study Builder Panel Component
 * 
 * Allows users to configure and run quantitative studies on market data points.
 * Supports custom parameters, presets, and saving configurations.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FlaskConical,
  Play,
  Save,
  RotateCcw,
  BookOpen,
  Zap,
  TrendingUp,
  LineChart,
  Gauge,
  Calendar,
  BarChart3,
  Shield,
  Target,
  Volume2,
  Layers,
  Info,
  Bookmark,
  ArrowRight,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Study definitions with full metadata
export const STUDY_CONFIG = {
  categories: [
    { id: 'basic', name: 'Basic Stats', icon: BarChart3, color: 'text-blue-500' },
    { id: 'seasonality', name: 'Timing', icon: Calendar, color: 'text-amber-500' },
    { id: 'technical', name: 'Technical', icon: LineChart, color: 'text-violet-500' },
    { id: 'volatility', name: 'Risk', icon: Shield, color: 'text-rose-500' },
    { id: 'patterns', name: 'Patterns', icon: Layers, color: 'text-emerald-500' },
    { id: 'volume', name: 'Volume', icon: Volume2, color: 'text-cyan-500' },
    { id: 'projections', name: 'Targets', icon: Target, color: 'text-orange-500' },
  ],
  studies: [
    {
      id: 'rsi_analysis',
      name: 'RSI Analysis',
      category: 'technical',
      icon: Gauge,
      description: 'Relative Strength Index to identify overbought/oversold conditions',
      difficulty: 'beginner',
      params: [
        { key: 'period', label: 'RSI Period', type: 'number', default: 14, min: 5, max: 50 },
        { key: 'overbought', label: 'Overbought Level', type: 'number', default: 70, min: 60, max: 90 },
        { key: 'oversold', label: 'Oversold Level', type: 'number', default: 30, min: 10, max: 40 },
      ],
    },
    {
      id: 'moving_average_analysis',
      name: 'Moving Averages',
      category: 'technical',
      icon: LineChart,
      description: 'Analyze short and long-term trends using moving averages',
      difficulty: 'beginner',
      params: [
        { key: 'shortPeriod', label: 'Short MA', type: 'number', default: 20, min: 5, max: 50 },
        { key: 'longPeriod', label: 'Long MA', type: 'number', default: 50, min: 20, max: 200 },
        { key: 'maType', label: 'MA Type', type: 'select', default: 'SMA', options: ['SMA', 'EMA', 'WMA'] },
      ],
    },
    {
      id: 'trend_strength',
      name: 'Trend Strength',
      category: 'technical',
      icon: TrendingUp,
      description: 'Measure the strength and direction of current trends',
      difficulty: 'intermediate',
      params: [
        { key: 'period', label: 'Analysis Period', type: 'number', default: 14, min: 5, max: 50 },
        { key: 'smoothing', label: 'Smoothing', type: 'number', default: 3, min: 1, max: 10 },
      ],
    },
    {
      id: 'day_of_week_returns',
      name: 'Day of Week Returns',
      category: 'seasonality',
      icon: Calendar,
      description: 'Analyze which days perform best historically',
      difficulty: 'beginner',
      params: [
        { key: 'lookback', label: 'Lookback (years)', type: 'number', default: 3, min: 1, max: 10 },
        { key: 'includeVolume', label: 'Include Volume', type: 'boolean', default: true },
      ],
    },
    {
      id: 'month_of_year_returns',
      name: 'Monthly Seasonality',
      category: 'seasonality',
      icon: Calendar,
      description: 'Identify best and worst months historically',
      difficulty: 'beginner',
      params: [
        { key: 'lookback', label: 'Lookback (years)', type: 'number', default: 5, min: 1, max: 20 },
      ],
    },
    {
      id: 'volatility_analysis',
      name: 'Volatility Profile',
      category: 'volatility',
      icon: Zap,
      description: 'Analyze historical volatility and risk metrics',
      difficulty: 'intermediate',
      params: [
        { key: 'period', label: 'Volatility Window', type: 'number', default: 20, min: 5, max: 60 },
        { key: 'annualize', label: 'Annualize', type: 'boolean', default: true },
      ],
    },
    {
      id: 'drawdown_analysis',
      name: 'Drawdown Analysis',
      category: 'volatility',
      icon: Shield,
      description: 'Analyze peak-to-trough declines and recovery times',
      difficulty: 'intermediate',
      params: [
        { key: 'threshold', label: 'Min Drawdown %', type: 'number', default: 5, min: 1, max: 20 },
      ],
    },
    {
      id: 'macd_analysis',
      name: 'MACD Analysis',
      category: 'technical',
      icon: LineChart,
      description: 'Moving Average Convergence Divergence for momentum',
      difficulty: 'intermediate',
      params: [
        { key: 'fastPeriod', label: 'Fast Period', type: 'number', default: 12, min: 5, max: 30 },
        { key: 'slowPeriod', label: 'Slow Period', type: 'number', default: 26, min: 15, max: 50 },
        { key: 'signalPeriod', label: 'Signal Period', type: 'number', default: 9, min: 3, max: 20 },
      ],
    },
    {
      id: 'bollinger_analysis',
      name: 'Bollinger Bands',
      category: 'technical',
      icon: LineChart,
      description: 'Volatility bands around moving average',
      difficulty: 'beginner',
      params: [
        { key: 'period', label: 'Period', type: 'number', default: 20, min: 10, max: 50 },
        { key: 'stdDev', label: 'Std Dev', type: 'number', default: 2, min: 1, max: 3 },
      ],
    },
    {
      id: 'gap_analysis',
      name: 'Gap Analysis',
      category: 'patterns',
      icon: Layers,
      description: 'Analyze opening gaps and fill patterns',
      difficulty: 'intermediate',
      params: [
        { key: 'minGapPercent', label: 'Min Gap %', type: 'number', default: 0.5, min: 0.1, max: 5 },
      ],
    },
    {
      id: 'volume_analysis',
      name: 'Volume Profile',
      category: 'volume',
      icon: Volume2,
      description: 'Analyze volume patterns and distribution',
      difficulty: 'beginner',
      params: [
        { key: 'period', label: 'Period', type: 'number', default: 20, min: 5, max: 60 },
      ],
    },
    {
      id: 'price_targets',
      name: 'Price Targets',
      category: 'projections',
      icon: Target,
      description: 'Statistical price target projections',
      difficulty: 'advanced',
      params: [
        { key: 'horizon', label: 'Forecast Days', type: 'number', default: 30, min: 5, max: 90 },
        { key: 'confidence', label: 'Confidence %', type: 'number', default: 95, min: 80, max: 99 },
      ],
    },
  ],
  presets: [
    {
      id: 'quick_health_check',
      name: 'Quick Health Check',
      description: 'Basic momentum and volatility assessment',
      studies: ['rsi_analysis', 'volatility_analysis'],
      icon: Sparkles,
    },
    {
      id: 'trend_analysis',
      name: 'Trend Analysis',
      description: 'Complete trend and moving average study',
      studies: ['moving_average_analysis', 'trend_strength', 'macd_analysis'],
      icon: TrendingUp,
    },
    {
      id: 'seasonality_deep_dive',
      name: 'Seasonality Deep Dive',
      description: 'Day and month patterns',
      studies: ['day_of_week_returns', 'month_of_year_returns'],
      icon: Calendar,
    },
    {
      id: 'risk_assessment',
      name: 'Risk Assessment',
      description: 'Volatility and drawdown analysis',
      studies: ['volatility_analysis', 'drawdown_analysis', 'bollinger_analysis'],
      icon: Shield,
    },
  ],
};

export interface StudyBuilderProps {
  symbol: string;
  symbolName?: string;
  onClose?: () => void;
}

export function StudyBuilderPanel({ symbol, symbolName, onClose }: StudyBuilderProps) {
  const navigate = useNavigate();
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, any>>>({});
  const [activeCategory, setActiveCategory] = useState<string>('technical');

  // Initialize study params with defaults
  const initStudyParams = useCallback((studyId: string) => {
    const study = STUDY_CONFIG.studies.find(s => s.id === studyId);
    if (!study) return;

    const defaults: Record<string, any> = {};
    study.params.forEach(p => {
      defaults[p.key] = p.default;
    });

    setStudyParams(prev => ({
      ...prev,
      [studyId]: defaults,
    }));
  }, []);

  // Toggle study selection
  const toggleStudy = (studyId: string) => {
    if (selectedStudies.includes(studyId)) {
      setSelectedStudies(prev => prev.filter(s => s !== studyId));
    } else {
      setSelectedStudies(prev => [...prev, studyId]);
      initStudyParams(studyId);
    }
  };

  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = STUDY_CONFIG.presets.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedStudies(preset.studies);
    preset.studies.forEach(studyId => {
      initStudyParams(studyId);
    });
    toast.success(`Applied "${preset.name}" preset`);
  };

  // Update parameter
  const updateParam = (studyId: string, key: string, value: any) => {
    setStudyParams(prev => ({
      ...prev,
      [studyId]: {
        ...(prev[studyId] || {}),
        [key]: value,
      },
    }));
  };

  // Run studies in Quant Lab
  const runInQuantLab = () => {
    if (selectedStudies.length === 0) {
      toast.error('Select at least one study');
      return;
    }

    // Build query params
    const params = new URLSearchParams({
      ticker: symbol,
      studies: selectedStudies.join(','),
    });

    // Add study params as JSON
    if (Object.keys(studyParams).length > 0) {
      params.set('params', JSON.stringify(studyParams));
    }

    navigate(`/quant-lab?${params.toString()}`);
    onClose?.();
  };

  // Get studies for current category
  const categoryStudies = STUDY_CONFIG.studies.filter(s => s.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Study Builder</h3>
            <p className="text-sm text-muted-foreground truncate">
              Configure studies for <span className="font-mono text-primary">{symbol}</span>
              {symbolName && ` (${symbolName})`}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {selectedStudies.length} selected
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick Presets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quick Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STUDY_CONFIG.presets.map((preset) => {
                const PresetIcon = preset.icon;
                return (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 justify-start gap-2 text-left"
                    onClick={() => applyPreset(preset.id)}
                  >
                    <PresetIcon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{preset.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{preset.studies.length} studies</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Category Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Quant Studies</span>
            </div>
            
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-2">
                {STUDY_CONFIG.categories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const count = STUDY_CONFIG.studies.filter(
                    s => s.category === cat.id && selectedStudies.includes(s.id)
                  ).length;

                  return (
                    <Button
                      key={cat.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 px-2.5 gap-1.5 shrink-0',
                        isActive && 'bg-primary/10 text-primary'
                      )}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <CatIcon className={cn('h-3.5 w-3.5', cat.color)} />
                      <span className="text-xs">{cat.name}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Studies List */}
            <div className="space-y-2 mt-3">
              {categoryStudies.map((study) => {
                const StudyIcon = study.icon;
                const isSelected = selectedStudies.includes(study.id);

                return (
                  <Card
                    key={study.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border/50 hover:border-border'
                    )}
                    onClick={() => toggleStudy(study.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-1.5 rounded-md',
                          isSelected ? 'bg-primary/20' : 'bg-muted/50'
                        )}>
                          <StudyIcon className={cn(
                            'h-4 w-4',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{study.name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-[10px] px-1.5 py-0',
                                study.difficulty === 'beginner' && 'border-emerald-500/30 text-emerald-500',
                                study.difficulty === 'intermediate' && 'border-amber-500/30 text-amber-500',
                                study.difficulty === 'advanced' && 'border-rose-500/30 text-rose-500'
                              )}
                            >
                              {study.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {study.description}
                          </p>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleStudy(study.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Studies Parameters */}
          {selectedStudies.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Configure Parameters</span>
                </div>
                
                <Accordion type="multiple" className="space-y-2">
                  {selectedStudies.map((studyId) => {
                    const study = STUDY_CONFIG.studies.find(s => s.id === studyId);
                    if (!study) return null;

                    const StudyIcon = study.icon;
                    const params = studyParams[studyId] || {};

                    return (
                      <AccordionItem 
                        key={studyId} 
                        value={studyId}
                        className="border border-border/50 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30">
                          <div className="flex items-center gap-2">
                            <StudyIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{study.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3">
                            {study.params.map((param) => (
                              <div key={param.key} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">{param.label}</Label>
                                  {param.type === 'number' && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {params[param.key] ?? param.default}
                                    </span>
                                  )}
                                </div>
                                
                                {param.type === 'number' && (
                                  <Slider
                                    value={[params[param.key] ?? param.default]}
                                    min={param.min}
                                    max={param.max}
                                    step={param.max && param.max <= 5 ? 0.1 : 1}
                                    onValueChange={([v]) => updateParam(studyId, param.key, v)}
                                    className="w-full"
                                  />
                                )}
                                
                                {param.type === 'boolean' && (
                                  <Switch
                                    checked={params[param.key] ?? param.default}
                                    onCheckedChange={(v) => updateParam(studyId, param.key, v)}
                                  />
                                )}
                                
                                {param.type === 'select' && (
                                  <Select
                                    value={params[param.key] ?? param.default}
                                    onValueChange={(v) => updateParam(studyId, param.key, v)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {param.options?.map((opt) => (
                                        <SelectItem key={opt} value={opt} className="text-xs">
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button 
          className="w-full gap-2" 
          onClick={runInQuantLab}
          disabled={selectedStudies.length === 0}
        >
          <Play className="h-4 w-4" />
          Run {selectedStudies.length} {selectedStudies.length === 1 ? 'Study' : 'Studies'} in Quant Lab
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => {
            setSelectedStudies([]);
            setStudyParams({});
          }}
          disabled={selectedStudies.length === 0}
        >
          <RotateCcw className="h-4 w-4" />
          Clear Selection
        </Button>
      </div>
    </div>
  );
}

// Sheet wrapper for easy use
export function StudyBuilderSheet({ 
  symbol, 
  symbolName,
  trigger,
}: StudyBuilderProps & { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Build Study
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <StudyBuilderPanel 
          symbol={symbol} 
          symbolName={symbolName}
          onClose={() => setOpen(false)} 
        />
      </SheetContent>
    </Sheet>
  );
}

export default StudyBuilderPanel;
