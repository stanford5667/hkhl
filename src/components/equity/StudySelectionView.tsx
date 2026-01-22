import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, Play, Sparkles, Settings2, Loader2, BookOpen, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { STUDY_DEFINITIONS, STUDY_CATEGORIES, type StudyDefinition } from '@/components/quant-lab/studyDefinitions';

interface StudySelectionViewProps {
  ticker: string;
  period: string;
  onPeriodChange: (value: string) => void;
  onSelectStudy: (studyId: string) => void;
  onRunStudy: (studyId: string) => void;
  isRunning: boolean;
  onShowFundamentals: () => void;
}

const PERIODS = [
  { value: '1y', label: '1 Year' },
  { value: '3y', label: '3 Years' },
  { value: '5y', label: '5 Years' },
  { value: '10y', label: '10 Years' },
];

// Math explanations for education section
const MATH_EXPLANATIONS: Record<string, { formula: string; explanation: string }> = {
  daily_close_gt_open: {
    formula: 'Percentage = (Days where Close > Open) / Total Days × 100',
    explanation: 'Measures intraday directional bias. A value above 50% suggests the asset tends to gain during trading hours.',
  },
  daily_close_gt_prior: {
    formula: 'Percentage = (Days where Closeₜ > Closeₜ₋₁) / Total Days × 100',
    explanation: 'Measures the frequency of positive daily returns. A value significantly above 50% indicates bullish momentum.',
  },
  daily_return_distribution: {
    formula: 'Return = (Closeₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100',
    explanation: 'The distribution shows how returns are spread. Skewness measures asymmetry; kurtosis measures tail risk.',
  },
  rsi_analysis: {
    formula: 'RS = Avg Gain / Avg Loss\nRSI = 100 - (100 / (1 + RS))',
    explanation: 'RSI > 70 is overbought; RSI < 30 is oversold. Shows how often those conditions occur.',
  },
};

// Map study IDs to categories
const CATEGORY_MAP: Record<string, string[]> = {
  basic: ['daily_close_gt_open', 'daily_close_gt_prior', 'daily_return_distribution', 'up_down_streaks'],
  seasonality: ['day_of_week_returns', 'month_of_year_returns'],
  technical: ['moving_average_analysis', 'rsi_analysis', 'trend_strength'],
  volatility: ['volatility_analysis', 'drawdown_analysis', 'mean_reversion'],
  patterns: ['gap_analysis', 'range_analysis', 'high_low_analysis', 'close_to_open_analysis'],
  volume: ['volume_analysis'],
  forecasting: ['price_targets'],
};

export function StudySelectionView({
  ticker,
  period,
  onPeriodChange,
  onSelectStudy,
  onRunStudy,
  isRunning,
  onShowFundamentals,
}: StudySelectionViewProps) {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [showEducation, setShowEducation] = useState(true);

  const handleSelectStudy = (studyId: string) => {
    setSelectedStudy(studyId);
    onSelectStudy(studyId);
  };

  const handleRunStudy = () => {
    if (selectedStudy) {
      onRunStudy(selectedStudy);
    }
  };

  const getStudiesForCategory = (categoryKey: string): StudyDefinition[] => {
    const studyIds = CATEGORY_MAP[categoryKey] || [];
    return studyIds
      .map(id => STUDY_DEFINITIONS.find(s => s.id === id))
      .filter((s): s is StudyDefinition => s !== undefined);
  };

  const selectedStudyDef = selectedStudy ? STUDY_DEFINITIONS.find(s => s.id === selectedStudy) : null;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Quantitative Studies
                <Badge variant="secondary" className="ml-2 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Enhanced
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Run statistical analysis on {ticker} historical data
              </CardDescription>
            </div>
            
            {/* View Fundamentals Link */}
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-2"
              onClick={onShowFundamentals}
            >
              <BookOpen className="h-4 w-4" />
              Fundamentals
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
              <TabsList className="w-max sm:w-full flex gap-1 bg-muted/50 p-1">
                {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
                  <TabsTrigger 
                    key={key} 
                    value={key} 
                    className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3 whitespace-nowrap"
                  >
                    <category.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{category.name}</span>
                    <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getStudiesForCategory(key).map((study) => (
                    <button
                      key={study.id}
                      onClick={() => handleSelectStudy(study.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all hover:border-primary/50 group",
                        selectedStudy === study.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors",
                          selectedStudy === study.id 
                            ? "bg-primary/10" 
                            : "bg-muted group-hover:bg-muted/80"
                        )}>
                          <study.icon className={cn(
                            "h-4 w-4",
                            selectedStudy === study.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className="font-medium text-sm">{study.name}</span>
                        {study.params && study.params.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                            <Settings2 className="h-2.5 w-2.5 mr-0.5" />
                            Params
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pl-8">{study.description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select value={period} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRunStudy}
              disabled={!selectedStudy || isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Study
            </Button>

            {selectedStudyDef && (
              <Badge variant="secondary" className="ml-auto">
                {selectedStudyDef.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Education Section */}
      <Card>
        <Collapsible open={showEducation} onOpenChange={setShowEducation}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors px-3 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Understanding the Math
                </CardTitle>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showEducation && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-3 sm:px-6 pt-0 pb-4">
              {selectedStudy && MATH_EXPLANATIONS[selectedStudy] ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Formula</Label>
                    <pre className="text-xs bg-muted p-3 rounded-md font-mono whitespace-pre-wrap">
                      {MATH_EXPLANATIONS[selectedStudy].formula}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Explanation</Label>
                    <p className="text-sm text-muted-foreground">
                      {MATH_EXPLANATIONS[selectedStudy].explanation}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a study above to see its mathematical explanation.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
