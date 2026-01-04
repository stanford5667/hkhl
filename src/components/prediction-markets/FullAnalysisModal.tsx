import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, TrendingUp, TrendingDown, FileText, Download,
  BarChart3, AlertTriangle, Clock, History, Calculator,
  PieChart, LineChart, Shield, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradeIdea } from './TradeIdeasDashboard';

interface FullAnalysisModalProps {
  idea: TradeIdea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FullAnalysisModal({ idea, open, onOpenChange }: FullAnalysisModalProps) {
  if (!idea) return null;

  const expectedReturn = ((idea.target_price - idea.entry_price) / idea.entry_price) * 100;
  const maxLoss = ((idea.entry_price - idea.stop_loss_price) / idea.entry_price) * 100;
  const isBullish = idea.direction === 'buy_yes' || idea.direction === 'sell_no';

  const handleExportPDF = () => {
    // In a real app, this would generate and download a PDF
    console.log('Exporting PDF for idea:', idea.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Full Trade Analysis
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Market Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Market Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">{idea.market?.title || 'Market'}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">
                    {idea.market?.platform || 'Unknown Platform'}
                  </Badge>
                  <Badge variant="secondary">
                    {idea.market?.category || 'Unknown Category'}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={cn(
                      isBullish 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                        : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                    )}
                  >
                    {isBullish ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {idea.direction.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {/* Price Levels */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
                    <p className="text-xl font-mono font-bold">{idea.entry_price.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Target Price</p>
                    <p className="text-xl font-mono font-bold text-emerald-500">
                      {idea.target_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-500">+{expectedReturn.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                    <p className="text-xl font-mono font-bold text-rose-500">
                      {idea.stop_loss_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-rose-500">-{maxLoss.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confidence Level</span>
                    <span className="text-lg font-bold">{idea.confidence}%</span>
                  </div>
                  <Progress value={idea.confidence} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis Tabs */}
            <Tabs defaultValue="thesis">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="thesis">Thesis</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
                <TabsTrigger value="calculations">Calculations</TabsTrigger>
              </TabsList>

              <TabsContent value="thesis" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Investment Thesis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground italic">
                          "{idea.thesis_summary}"
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Detailed Analysis</h4>
                        <p className="text-sm whitespace-pre-wrap">
                          {idea.thesis_detailed || 'No detailed thesis available.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Catalyst Events */}
                {idea.catalyst_events && idea.catalyst_events.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Catalyst Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {idea.catalyst_events.map((catalyst, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-500">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{catalyst.event}</p>
                              <p className="text-sm text-muted-foreground">
                                Impact: {catalyst.impact}
                              </p>
                            </div>
                            <Badge variant="outline">{catalyst.date}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      Supporting Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {idea.supporting_evidence?.map((evidence, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {evidence.type}
                            </Badge>
                            <Badge 
                              variant="secondary"
                              className={cn(
                                evidence.strength === 'strong' ? 'bg-emerald-500/10 text-emerald-500' :
                                evidence.strength === 'moderate' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-muted'
                              )}
                            >
                              {evidence.strength}
                            </Badge>
                          </div>
                          <p className="text-sm">{evidence.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Counter-Arguments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {idea.counter_arguments?.map((counter, i) => (
                        <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{counter.argument}</p>
                            <Badge 
                              variant="outline"
                              className={cn(
                                counter.severity === 'high' ? 'text-rose-500 border-rose-500/30' :
                                counter.severity === 'medium' ? 'text-amber-500 border-amber-500/30' :
                                ''
                              )}
                            >
                              {counter.severity} severity
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Mitigation: </span>
                            {counter.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risk" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                        <Badge 
                          className={cn(
                            "text-base",
                            idea.risk_level === 'low' ? 'bg-emerald-500' :
                            idea.risk_level === 'medium' ? 'bg-amber-500' :
                            'bg-rose-500'
                          )}
                        >
                          {idea.risk_level.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Max Potential Loss</p>
                        <p className="text-xl font-bold text-rose-500">-{maxLoss.toFixed(1)}%</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Time Horizon</p>
                        <p className="text-lg font-semibold capitalize">
                          {idea.time_horizon?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                        <p className="text-lg font-mono font-semibold text-rose-500">
                          {idea.stop_loss_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Risk Scenarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg">
                        <span className="font-medium">Best Case (Target Hit)</span>
                        <span className="text-emerald-500 font-bold">+{expectedReturn.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Base Case (Partial Move)</span>
                        <span className="font-bold">+{(expectedReturn * 0.5).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-rose-500/10 rounded-lg">
                        <span className="font-medium">Worst Case (Stop Hit)</span>
                        <span className="text-rose-500 font-bold">-{maxLoss.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calculations" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-purple-500" />
                      Position Sizing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Suggested Allocation</p>
                        <p className="text-xl font-bold">{idea.suggested_allocation.toFixed(1)}%</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Kelly Fraction</p>
                        <p className="text-xl font-bold">{idea.kelly_fraction.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-500" />
                      Expected Value Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Expected Value (EV)</span>
                          <span className="text-lg font-bold text-primary">
                            +{((idea.confidence / 100) * expectedReturn - ((100 - idea.confidence) / 100) * maxLoss).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Based on {idea.confidence}% probability of success
                        </p>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">Calculation breakdown:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Win probability: {idea.confidence}%</li>
                          <li>Win return: +{expectedReturn.toFixed(1)}%</li>
                          <li>Loss probability: {100 - idea.confidence}%</li>
                          <li>Loss return: -{maxLoss.toFixed(1)}%</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Historical Similar Ideas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-500" />
                  Similar Past Ideas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No similar historical ideas found</p>
                  <p className="text-sm">Track record will build over time</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
