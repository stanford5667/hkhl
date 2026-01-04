import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  Play, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  Download,
  Save,
  ChevronDown,
  BarChart3,
  Percent,
  Clock,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';

interface Condition {
  type: string;
  metric: string;
  operator: string;
  value: number | string;
}

interface ParsedStrategy {
  strategy_name: string;
  entry_conditions: Condition[];
  entry_logic: 'AND' | 'OR';
  exit_conditions: Condition[];
  exit_logic: 'AND' | 'OR';
  position_sizing: string;
  max_positions: number;
  category_filter: string | null;
}

interface Trade {
  market_id: string;
  market_title: string;
  entry_date: string;
  entry_price: number;
  exit_date: string | null;
  exit_price: number | null;
  pnl: number;
  pnl_percent: number;
  holding_days: number;
  exit_reason: string;
}

interface BacktestResults {
  total_return: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_trades: number;
  avg_holding_period: number;
  trades: Trade[];
  equity_curve: Array<{ date: string; value: number }>;
  category_breakdown: Record<string, { trades: number; pnl: number }>;
}

interface Analysis {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  confidence_in_forward_performance?: number;
  warnings?: string[];
}

const STRATEGY_TEMPLATES = [
  {
    name: 'KOL + Whale Momentum',
    text: 'Buy when KOL sentiment is above 0.5, at least one whale with >80% win rate has bought in the last 24 hours, and current price is below 60%. Sell when price reaches 75% or 7 days before resolution.'
  },
  {
    name: 'Contrarian Value',
    text: 'Buy when price drops more than 15% in 24 hours, sentiment is below 0.3, and volume is above average. Sell at 20% profit or after 14 days.'
  },
  {
    name: 'Smart Money Follow',
    text: 'Buy when smart money ratio is above 2.0 and price is below 50%. Exit when smart money starts selling or at 80% price.'
  },
  {
    name: 'Resolution Momentum',
    text: 'Buy when price momentum is positive, less than 30 days to resolution, and volume is increasing. Hold until resolution.'
  }
];

export function StrategyBacktester() {
  const [strategyText, setStrategyText] = useState('');
  const [parsedStrategy, setParsedStrategy] = useState<ParsedStrategy | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showTrades, setShowTrades] = useState(false);
  
  // Settings
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [initialCapital, setInitialCapital] = useState('10000');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleParse = async () => {
    if (!strategyText.trim()) return;
    
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-strategy-backtest', {
        body: { action: 'parse', strategy_text: strategyText }
      });

      if (error) throw error;
      if (data.success) {
        setParsedStrategy(data.parsed_strategy);
      }
    } catch (err) {
      console.error('Parse error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleBacktest = async () => {
    if (!parsedStrategy) return;
    
    setIsBacktesting(true);
    setResults(null);
    setAnalysis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-strategy-backtest', {
        body: {
          action: 'backtest',
          parsed_strategy: parsedStrategy,
          start_date: startDate,
          end_date: endDate,
          initial_capital: parseFloat(initialCapital),
          categories: categoryFilter === 'all' ? null : categoryFilter
        }
      });

      if (error) throw error;
      if (data.success) {
        setResults(data.results);
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Backtest error:', err);
    } finally {
      setIsBacktesting(false);
    }
  };

  const loadTemplate = (template: typeof STRATEGY_TEMPLATES[0]) => {
    setStrategyText(template.text);
    setParsedStrategy(null);
    setResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Strategy Definition */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Strategy Backtester</CardTitle>
            </div>
            <Select onValueChange={(v) => loadTemplate(STRATEGY_TEMPLATES.find(t => t.name === v)!)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Load Template" />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TEMPLATES.map(t => (
                  <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Define Your Strategy (plain English)</label>
            <Textarea
              value={strategyText}
              onChange={(e) => setStrategyText(e.target.value)}
              placeholder="Buy when KOL sentiment is above 0.5 and whales are accumulating and price is below 60%. Sell at 75% or near resolution."
              className="min-h-[100px]"
            />
          </div>
          <Button onClick={handleParse} disabled={isParsing || !strategyText.trim()}>
            {isParsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Parse Strategy
          </Button>

          {/* Parsed Rules */}
          {parsedStrategy && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{parsedStrategy.strategy_name}</h4>
                <Badge variant="outline">Parsed</Badge>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Entry:</span>{' '}
                  {parsedStrategy.entry_conditions.map(c => `${c.metric} ${c.operator} ${c.value}`).join(` ${parsedStrategy.entry_logic} `)}
                </p>
                <p>
                  <span className="text-muted-foreground">Exit:</span>{' '}
                  {parsedStrategy.exit_conditions.map(c => `${c.metric} ${c.operator} ${c.value}`).join(` ${parsedStrategy.exit_logic} `)}
                </p>
                <p>
                  <span className="text-muted-foreground">Sizing:</span> {parsedStrategy.position_sizing}
                  {' | '}
                  <span className="text-muted-foreground">Max Positions:</span> {parsedStrategy.max_positions}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backtest Settings */}
      {parsedStrategy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Backtest Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Initial Capital</label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  min="100"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="politics">Politics</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleBacktest} 
              disabled={isBacktesting} 
              className="mt-4 w-full"
              size="lg"
            >
              {isBacktesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Backtest
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isBacktesting && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Running backtest simulation...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <>
          {/* Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <MetricCard
              icon={<Percent className="h-4 w-4" />}
              label="Total Return"
              value={`${results.total_return >= 0 ? '+' : ''}${(results.total_return * 100).toFixed(1)}%`}
              variant={results.total_return >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              icon={<Target className="h-4 w-4" />}
              label="Win Rate"
              value={`${(results.win_rate * 100).toFixed(1)}%`}
              variant={results.win_rate >= 0.5 ? 'success' : 'warning'}
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Sharpe Ratio"
              value={results.sharpe_ratio.toFixed(2)}
              variant={results.sharpe_ratio >= 1 ? 'success' : 'warning'}
            />
            <MetricCard
              icon={<TrendingDown className="h-4 w-4" />}
              label="Max Drawdown"
              value={`-${(results.max_drawdown * 100).toFixed(1)}%`}
              variant={results.max_drawdown <= 0.1 ? 'success' : 'danger'}
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Total Trades"
              value={results.total_trades.toString()}
              variant="neutral"
            />
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label="Avg Hold"
              value={`${results.avg_holding_period.toFixed(1)} days`}
              variant="neutral"
            />
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.equity_curve}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => format(new Date(v), 'MMM')}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="url(#equityGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {analysis && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.summary && (
                  <p className="text-sm">{analysis.summary}</p>
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.strengths && analysis.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Strengths
                      </h4>
                      <ul className="text-sm space-y-1">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Areas for Improvement
                      </h4>
                      <ul className="text-sm space-y-1">
                        {analysis.weaknesses.map((w, i) => (
                          <li key={i} className="text-muted-foreground">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {analysis.suggestions && analysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      Suggestions
                    </h4>
                    <ul className="text-sm space-y-1">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.confidence_in_forward_performance !== undefined && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Forward Performance Confidence:</span>
                    <Badge variant={analysis.confidence_in_forward_performance >= 0.7 ? 'default' : 'secondary'}>
                      {(analysis.confidence_in_forward_performance * 100).toFixed(0)}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trade List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Trade History</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTrades(!showTrades)}>
                  {showTrades ? 'Hide' : 'Show'} Trades
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showTrades ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            {showTrades && (
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {results.trades.map((trade, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded text-sm">
                        <div className="flex-1">
                          <p className="font-medium truncate max-w-[300px]">{trade.market_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {trade.entry_date} → {trade.exit_date} ({trade.holding_days}d)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(trade.entry_price * 100).toFixed(0)}% → {((trade.exit_price || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
            <Button variant="outline" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Strategy
            </Button>
            <Button className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Go Live
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  variant 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const variantClasses = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
    neutral: 'text-foreground'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-xl font-bold ${variantClasses[variant]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default StrategyBacktester;
