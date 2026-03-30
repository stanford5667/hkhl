import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, BookOpen, AlertTriangle, Target, Scale } from 'lucide-react';
import { format } from 'date-fns';
import type { Position } from './SimPortfolioDetail';

interface Props {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSellFull: (pos: Position) => void;
  onSellPartial: (pos: Position, qty: number) => void;
  portfolioValue: number;
  cashBalance: number;
}

export function PositionDetailDialog({ position, open, onOpenChange, onSellFull, onSellPartial, portfolioValue, cashBalance }: Props) {
  const [partialQty, setPartialQty] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  if (!position) return null;

  const pos = position;
  const multiplier = pos.instrument_type === 'option' ? pos.contract_multiplier : 1;
  const positionWeight = portfolioValue > 0 && pos.current_value ? (pos.current_value / portfolioValue) * 100 : 0;
  const isProfit = (pos.pnl ?? 0) >= 0;

  const handleSellPartial = () => {
    const qty = parseInt(partialQty);
    if (!qty || qty <= 0 || qty >= pos.quantity) return;
    onSellPartial(pos, qty);
    setPartialQty('');
    onOpenChange(false);
  };

  const handleSellFull = () => {
    onSellFull(pos);
    onOpenChange(false);
  };

  // Educational content based on position characteristics
  const getLearningContent = () => {
    const lessons: { title: string; content: string; icon: React.ReactNode }[] = [];

    // Position sizing lesson
    if (positionWeight > 20) {
      lessons.push({
        title: 'Concentration Risk',
        content: `This position is ${positionWeight.toFixed(1)}% of your portfolio. Institutional managers typically cap single positions at 5-10%. High concentration amplifies both gains and losses — consider trimming to manage risk.`,
        icon: <AlertTriangle className="w-4 h-4 text-warning" />,
      });
    } else {
      lessons.push({
        title: 'Position Sizing',
        content: `At ${positionWeight.toFixed(1)}% of your portfolio, this position is well-sized. Professional traders use position sizing to ensure no single loss can significantly damage their portfolio.`,
        icon: <Scale className="w-4 h-4 text-success" />,
      });
    }

    // P&L lesson
    if (pos.pnl !== null) {
      if (pos.pnl > 0 && (pos.pnl_pct ?? 0) > 20) {
        lessons.push({
          title: 'Taking Profits',
          content: `You're up ${pos.pnl_pct?.toFixed(1)}%. Consider taking partial profits to lock in gains. A common strategy: sell half to "play with house money" while letting the rest run. This reduces regret if the position reverses.`,
          icon: <TrendingUp className="w-4 h-4 text-success" />,
        });
      } else if (pos.pnl < 0 && (pos.pnl_pct ?? 0) < -10) {
        lessons.push({
          title: 'Managing Losses',
          content: `This position is down ${Math.abs(pos.pnl_pct ?? 0).toFixed(1)}%. Ask yourself: "If I didn't own this, would I buy it today at this price?" If no, consider cutting the loss. Professional traders use stop-losses to prevent small losses from becoming big ones.`,
          icon: <TrendingDown className="w-4 h-4 text-destructive" />,
        });
      }
    }

    // Options-specific lessons
    if (pos.instrument_type === 'option') {
      lessons.push({
        title: 'Options Time Decay (Theta)',
        content: `Options lose value every day due to time decay. As expiration approaches, this decay accelerates. If your directional thesis hasn't played out, consider closing before the final 30 days when theta erosion is steepest.`,
        icon: <BookOpen className="w-4 h-4 text-primary" />,
      });
    }

    // Cost basis lesson
    lessons.push({
      title: 'Dollar Cost Averaging',
      content: `Your average cost is $${pos.avg_cost.toFixed(2)}. If you believe in this position long-term, buying more at lower prices reduces your average cost. But only add if your original thesis is intact — don't throw good money after bad.`,
      icon: <DollarSign className="w-4 h-4 text-primary" />,
    });

    return lessons;
  };

  const lessons = getLearningContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl">{pos.ticker}</span>
            {pos.instrument_type === 'option' && (
              <span className={`text-xs px-2 py-0.5 rounded ${pos.option_type === 'call' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                {pos.option_type?.toUpperCase()} ${pos.strike_price}
              </span>
            )}
            <span className={`text-sm font-mono ${isProfit ? 'text-success' : 'text-destructive'}`}>
              {pos.pnl !== null ? `${isProfit ? '+' : ''}$${pos.pnl.toFixed(2)} (${isProfit ? '+' : ''}${pos.pnl_pct?.toFixed(2)}%)` : '—'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {pos.quantity} {pos.instrument_type === 'option' ? 'contracts' : 'shares'} · Avg cost ${pos.avg_cost.toFixed(2)} · {positionWeight.toFixed(1)}% of portfolio
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="actions">Sell / Adjust</TabsTrigger>
            <TabsTrigger value="learn">Learn</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="text-lg font-bold font-mono">
                    {pos.current_price ? `$${pos.current_price.toFixed(2)}` : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Market Value</p>
                  <p className="text-lg font-bold font-mono">
                    {pos.current_value ? `$${pos.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Total Cost Basis</p>
                  <p className="text-lg font-bold font-mono">${pos.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Portfolio Weight</p>
                  <p className="text-lg font-bold font-mono">{positionWeight.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            {pos.instrument_type === 'option' && (
              <Card>
                <CardContent className="pt-4 pb-3 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-bold">{pos.option_type?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Strike</p>
                    <p className="font-bold font-mono">${pos.strike_price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expiration</p>
                    <p className="font-bold">{pos.expiration_date ? format(new Date(pos.expiration_date), 'MMM dd, yyyy') : '—'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick insight */}
            {lessons.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  {lessons[0].icon}
                  <div>
                    <p className="text-sm font-semibold">{lessons[0].title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{lessons[0].content}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            {/* Sell Full Position */}
            <Card>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-destructive" />
                  <h3 className="font-semibold">Close Entire Position</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sell all {pos.quantity} {pos.instrument_type === 'option' ? 'contracts' : 'shares'} at market price (~${pos.current_price?.toFixed(2) ?? pos.avg_cost.toFixed(2)}).
                  Proceeds: ~${((pos.current_price ?? pos.avg_cost) * pos.quantity * multiplier).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <Button variant="destructive" onClick={handleSellFull} className="w-full">
                  Close Full Position
                </Button>
              </CardContent>
            </Card>

            {/* Sell Partial */}
            {pos.quantity > 1 && (
              <Card>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Trim Position</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sell some {pos.instrument_type === 'option' ? 'contracts' : 'shares'} to reduce exposure while keeping some upside.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Quantity to sell (max {pos.quantity - 1})</Label>
                      <Input
                        type="number"
                        min={1}
                        max={pos.quantity - 1}
                        value={partialQty}
                        onChange={e => setPartialQty(e.target.value)}
                        placeholder={`1 - ${pos.quantity - 1}`}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="self-end"
                      onClick={handleSellPartial}
                      disabled={!partialQty || parseInt(partialQty) <= 0 || parseInt(partialQty) >= pos.quantity}
                    >
                      Sell {partialQty || '…'}
                    </Button>
                  </div>
                  {/* Quick trim buttons */}
                  <div className="flex gap-2">
                    {[25, 50, 75].map(pct => {
                      const qty = Math.max(1, Math.floor(pos.quantity * pct / 100));
                      if (qty >= pos.quantity) return null;
                      return (
                        <Button key={pct} variant="ghost" size="sm" onClick={() => setPartialQty(qty.toString())}>
                          Sell {pct}% ({qty})
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="learn" className="space-y-3 mt-4">
            {lessons.map((lesson, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{lesson.icon}</div>
                    <div>
                      <h3 className="font-semibold text-sm">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{lesson.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Every trade is a lesson. Review your positions regularly and ask: <em>"Does my original thesis still hold?"</em>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
