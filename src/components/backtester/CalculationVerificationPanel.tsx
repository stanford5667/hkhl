import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, FileText, FileJson, RefreshCw, Database, Calculator, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { METRIC_DEFINITIONS, getMetricDefinition } from '@/data/metricDefinitions';
import type { PortfolioMetrics, CalculationTrace } from '@/hooks/usePortfolioCalculations';

export interface CalculationVerificationPanelProps {
  metrics: PortfolioMetrics;
  traces: CalculationTrace[];
  dataInfo: {
    startDate: string;
    endDate: string;
    tradingDays: number;
    dataSource: string;
  };
  allocations: { ticker: string; weight: number }[];
  onRecalculate: () => void;
  className?: string;
}

interface TickerDataInfo {
  ticker: string;
  source: string;
  startDate: string;
  endDate: string;
  dataPoints: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

const qualityColors = {
  excellent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  good: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  fair: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  poor: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

export function CalculationVerificationPanel({
  metrics,
  traces,
  dataInfo,
  allocations,
  onRecalculate,
  className,
}: CalculationVerificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Generate ticker data info from allocations and dataInfo
  const tickerDataInfos: TickerDataInfo[] = allocations.map((alloc) => ({
    ticker: alloc.ticker,
    source: dataInfo.dataSource || 'Polygon API',
    startDate: dataInfo.startDate,
    endDate: dataInfo.endDate,
    dataPoints: dataInfo.tradingDays,
    quality: dataInfo.tradingDays >= 200 ? 'excellent' : 
             dataInfo.tradingDays >= 100 ? 'good' : 
             dataInfo.tradingDays >= 50 ? 'fair' : 'poor',
  }));

  const toggleMetricExpanded = useCallback((metricId: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  }, []);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Temporarily expand for capture
      const wasOpen = isOpen;
      if (!wasOpen) setIsOpen(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (panelRef.current) {
        const canvas = await html2canvas(panelRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add title
        pdf.setFontSize(18);
        pdf.text('Portfolio Calculation Verification Report', 14, 20);
        pdf.setFontSize(10);
        pdf.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 28);
        
        // Add image
        let heightLeft = imgHeight;
        let position = 35;
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - position);
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`portfolio-verification-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      }
      
      if (!wasOpen) setIsOpen(false);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isOpen]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      generatedAt: new Date().toISOString(),
      dataInfo,
      allocations,
      metrics,
      traces,
      tickerDataInfos,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-calculations-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dataInfo, allocations, metrics, traces, tickerDataInfos]);

  // Get all available metrics with their traces
  const metricsWithTraces = Object.entries(metrics || {}).map(([key, value]) => {
    const definition = getMetricDefinition(key);
    const trace = traces.find(t => t.metricId === key);
    return { key, value, definition, trace };
  }).filter(m => m.definition && typeof m.value === 'number');

  return (
    <Card className={cn('w-full', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base">Verify Calculations</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {traces.length} traces available
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent ref={panelRef} className="pt-0 space-y-6">
            {/* A. DATA SOURCES SECTION */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Data Sources</h3>
              </div>
              
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Ticker</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Date Range</TableHead>
                      <TableHead className="text-xs text-center">Data Points</TableHead>
                      <TableHead className="text-xs text-center">Quality</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickerDataInfos.map((info) => (
                      <TableRow key={info.ticker}>
                        <TableCell className="font-mono font-medium text-sm">{info.ticker}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{info.source}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {info.startDate} → {info.endDate}
                        </TableCell>
                        <TableCell className="text-center text-sm">{info.dataPoints}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn('text-xs capitalize', qualityColors[info.quality])}>
                            {info.quality}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Data fetched at: {format(new Date(), 'PPpp')}
              </p>
            </section>

            <Separator />

            {/* B. CALCULATIONS SECTION */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Calculations</h3>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {metricsWithTraces.length} metrics
                </Badge>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {metricsWithTraces.map(({ key, value, definition, trace }) => {
                    const isExpanded = expandedMetrics.has(key);
                    
                    return (
                      <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleMetricExpanded(key)}>
                        <CollapsibleTrigger asChild>
                          <button className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            'hover:bg-muted/50',
                            isExpanded ? 'border-primary/50 bg-primary/5' : 'border-border'
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">{definition?.name || key}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                  {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                </code>
                                {trace ? (
                                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-2 ml-6 animate-accordion-down">
                          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                            {/* Formula */}
                            {definition?.formula && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Formula:</p>
                                <code className="text-xs font-mono block bg-muted p-2 rounded">
                                  {definition.formula}
                                </code>
                              </div>
                            )}
                            
                            {/* Trace Steps */}
                            {trace && trace.steps.length > 0 ? (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Calculation Steps:</p>
                                <ol className="space-y-2">
                                  {trace.steps.map((step, idx) => (
                                    <li key={idx} className="flex gap-2 text-xs">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center justify-center">
                                        {step.step}
                                      </span>
                                      <div className="flex-1">
                                        <p className="font-medium">{step.description}</p>
                                        {step.formula && (
                                          <code className="text-muted-foreground block mt-0.5">{step.formula}</code>
                                        )}
                                        {step.inputs && Object.keys(step.inputs).length > 0 && (
                                          <div className="text-muted-foreground mt-1">
                                            Inputs: {Object.entries(step.inputs).map(([k, v]) => (
                                              <span key={k} className="inline-flex items-center gap-0.5 mr-2">
                                                <span className="font-mono">{k}</span>=
                                                <span className="font-semibold text-foreground">
                                                  {typeof v === 'number' ? v.toFixed(4) : String(v)}
                                                </span>
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <div className="mt-1">
                                          <span className="text-muted-foreground">→ </span>
                                          <span className="font-semibold text-foreground">
                                            {typeof step.result === 'number' ? step.result.toFixed(6) : String(step.result)}
                                          </span>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                No detailed trace available for this metric. Enable trace generation for full transparency.
                              </p>
                            )}
                            
                            {/* Final Result */}
                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Final Result:</span>
                                <code className="text-sm font-mono font-semibold text-primary">
                                  {typeof value === 'number' ? value.toFixed(6) : String(value)}
                                </code>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>

            <Separator />

            {/* C. EXPORT SECTION */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Export & Actions</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export as PDF'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJSON}
                  className="gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Export as JSON
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRecalculate}
                  className="gap-2 ml-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recalculate
                </Button>
              </div>
            </section>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default CalculationVerificationPanel;
