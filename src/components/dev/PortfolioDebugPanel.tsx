/**
 * Portfolio Debug Panel
 * 
 * Developer tool for verifying data accuracy during development.
 * Only visible when localStorage 'debugMode' is 'true' or URL has ?debug=true
 * 
 * Features:
 * - Data Inspector with tree view
 * - API Call Log with timing
 * - Calculation Tracer
 * - Quick Actions (cache, refresh, export)
 * - Validation Dashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Download,
  FlaskConical,
  Activity,
  Database,
  Calculator,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import {
  validateTickerData,
  validatePortfolioMetrics,
  validateCorrelationMatrix,
  generateDataAuditReport,
  type OHLCVBar,
} from '@/services/dataValidationService';

// ============================================
// TYPES
// ============================================

interface APILogEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  ticker?: string;
  status: number;
  duration: number;
  requestBody?: unknown;
  responseData?: unknown;
  error?: string;
}

interface CalculationStep {
  step: number;
  name: string;
  inputs: Record<string, number | string>;
  formula: string;
  result: number | string;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

interface DebugState {
  portfolioData: Record<string, unknown>;
  apiLogs: APILogEntry[];
  validationIssues: ValidationIssue[];
  calculations: Map<string, CalculationStep[]>;
}

// Global state for debug data
const debugState: DebugState = {
  portfolioData: {},
  apiLogs: [],
  validationIssues: [],
  calculations: new Map(),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') return true;
  
  // Check localStorage
  try {
    return localStorage.getItem('debugMode') === 'true';
  } catch {
    return false;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// API INTERCEPTOR
// ============================================

export function logAPICall(entry: Omit<APILogEntry, 'id' | 'timestamp'>): void {
  debugState.apiLogs.unshift({
    ...entry,
    id: generateId(),
    timestamp: new Date(),
  });
  
  // Keep only last 100 entries
  if (debugState.apiLogs.length > 100) {
    debugState.apiLogs.pop();
  }
}

export function setPortfolioData(key: string, data: unknown): void {
  debugState.portfolioData[key] = data;
}

export function logCalculation(name: string, steps: CalculationStep[]): void {
  debugState.calculations.set(name, steps);
}

export function addValidationIssue(issue: ValidationIssue): void {
  debugState.validationIssues.push(issue);
}

export function clearValidationIssues(): void {
  debugState.validationIssues = [];
}

// ============================================
// TREE VIEW COMPONENT
// ============================================

interface TreeNodeProps {
  name: string;
  value: unknown;
  depth?: number;
  onCopy: (value: string) => void;
}

function TreeNode({ name, value, depth = 0, onCopy }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const hasChildren = isObject && Object.keys(value as object).length > 0;
  
  const displayValue = useMemo(() => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return `"${value}"`;
    if (isArray) return `Array(${(value as unknown[]).length})`;
    if (isObject) return `{${Object.keys(value as object).length} keys}`;
    return String(value);
  }, [value, isArray, isObject]);
  
  const valueColor = useMemo(() => {
    if (value === null || value === undefined) return 'text-muted-foreground';
    if (typeof value === 'boolean') return 'text-purple-500';
    if (typeof value === 'number') return 'text-blue-500';
    if (typeof value === 'string') return 'text-emerald-500';
    return 'text-foreground';
  }, [value]);
  
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-1 py-0.5 hover:bg-muted/50 rounded group">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        <span className="text-sm font-medium text-foreground">{name}:</span>
        
        {!hasChildren && (
          <span className={`text-sm ${valueColor}`}>{displayValue}</span>
        )}
        
        {hasChildren && !expanded && (
          <span className="text-sm text-muted-foreground">{displayValue}</span>
        )}
        
        <button
          onClick={() => onCopy(JSON.stringify(value, null, 2))}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded ml-auto"
          title="Copy value"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {Object.entries(value as object).map(([key, val]) => (
            <TreeNode
              key={key}
              name={isArray ? `[${key}]` : key}
              value={val}
              depth={depth + 1}
              onCopy={onCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN DEBUG PANEL COMPONENT
// ============================================

export default function PortfolioDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inspector');
  const [copied, setCopied] = useState(false);
  const [apiFilter, setApiFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Check if debug mode is enabled
  const debugEnabled = useMemo(() => isDebugEnabled(), []);
  
  // Copy to clipboard handler
  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to clipboard',
      duration: 1500,
    });
  }, []);
  
  // Clear cache
  const handleClearCache = useCallback(() => {
    try {
      // Clear localStorage cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('polygon_') || key?.startsWith('quote_') || key?.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: 'Cache cleared',
        description: `Removed ${keysToRemove.length} cached entries`,
      });
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast({
        title: 'Error clearing cache',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, []);
  
  // Force refresh
  const handleForceRefresh = useCallback(() => {
    handleClearCache();
    window.location.reload();
  }, [handleClearCache]);
  
  // Export state
  const handleExportState = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      portfolioData: debugState.portfolioData,
      apiLogs: debugState.apiLogs,
      validationIssues: debugState.validationIssues,
      calculations: Object.fromEntries(debugState.calculations),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-debug-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'State exported', description: 'Debug data saved to file' });
  }, []);
  
  // Inject test data
  const handleInjectTestData = useCallback(() => {
    // Generate test OHLCV data
    const testTickers = ['TEST1', 'TEST2', 'TEST3'];
    const testData: Record<string, OHLCVBar[]> = {};
    
    testTickers.forEach(ticker => {
      const bars: OHLCVBar[] = [];
      let price = 100;
      for (let i = 0; i < 252; i++) {
        price *= (1 + (Math.random() - 0.48) * 0.02);
        bars.push({
          t: Date.now() - (252 - i) * 24 * 60 * 60 * 1000,
          o: price,
          h: price * 1.01,
          l: price * 0.99,
          c: price,
          v: 1000000,
        });
      }
      testData[ticker] = bars;
    });
    
    setPortfolioData('testInjectedData', testData);
    
    // Run validation
    clearValidationIssues();
    Object.entries(testData).forEach(([ticker, bars]) => {
      const result = validateTickerData(ticker, bars);
      if (!result.isValid) {
        result.issues.forEach(issue => {
          addValidationIssue({
            severity: 'warning',
            category: 'Data Quality',
            message: `${ticker}: ${issue}`,
          });
        });
      }
    });
    
    toast({
      title: 'Test data injected',
      description: `Added ${testTickers.length} test tickers with 252 bars each`,
    });
    setRefreshKey(k => k + 1);
  }, []);
  
  // Run validation
  const handleRunValidation = useCallback(() => {
    clearValidationIssues();
    
    const data = debugState.portfolioData;
    let issueCount = 0;
    
    // Validate any ticker data found
    if (data.assetData && typeof data.assetData === 'object') {
      const assetData = data.assetData as Record<string, { bars?: OHLCVBar[] }>;
      Object.entries(assetData).forEach(([ticker, asset]) => {
        if (asset.bars) {
          const result = validateTickerData(ticker, asset.bars);
          result.issues.forEach(issue => {
            addValidationIssue({
              severity: result.dataQuality === 'low' ? 'error' : 'warning',
              category: 'Data Quality',
              message: `${ticker}: ${issue}`,
              suggestion: 'Consider refetching data or checking data source',
            });
            issueCount++;
          });
        }
      });
    }
    
    // Validate metrics
    if (data.metrics && typeof data.metrics === 'object') {
      const metrics = data.metrics as Record<string, number>;
      const result = validatePortfolioMetrics({
        annualReturn: metrics.annualReturn,
        annualVolatility: metrics.volatility,
        sharpeRatio: metrics.sharpe,
        maxDrawdown: metrics.maxDrawdown,
      });
      result.issues.forEach(issue => {
        addValidationIssue({
          severity: 'error',
          category: 'Metrics',
          message: issue,
          suggestion: 'Review calculation inputs and methodology',
        });
        issueCount++;
      });
    }
    
    // Validate correlation matrix
    if (data.correlationMatrix && Array.isArray(data.correlationMatrix)) {
      const result = validateCorrelationMatrix(data.correlationMatrix as number[][]);
      result.issues.forEach(issue => {
        addValidationIssue({
          severity: 'error',
          category: 'Correlation',
          message: issue,
          suggestion: 'Regenerate correlation matrix from source data',
        });
        issueCount++;
      });
    }
    
    if (issueCount === 0) {
      addValidationIssue({
        severity: 'info',
        category: 'Validation',
        message: 'All validation checks passed',
      });
    }
    
    toast({
      title: 'Validation complete',
      description: issueCount === 0 ? 'No issues found' : `Found ${issueCount} issues`,
      variant: issueCount > 0 ? 'destructive' : 'default',
    });
    setRefreshKey(k => k + 1);
  }, []);
  
  // Filtered API logs
  const filteredApiLogs = useMemo(() => {
    if (!apiFilter) return debugState.apiLogs;
    const filter = apiFilter.toLowerCase();
    return debugState.apiLogs.filter(log =>
      log.url.toLowerCase().includes(filter) ||
      log.ticker?.toLowerCase().includes(filter)
    );
  }, [apiFilter, refreshKey]);
  
  // Setup global debug object
  useEffect(() => {
    if (!debugEnabled) return;
    
    // Expose debug functions globally
    const windowDebug = {
      getData: () => debugState.portfolioData,
      getApiLogs: () => debugState.apiLogs,
      validate: () => {
        handleRunValidation();
        return debugState.validationIssues;
      },
      compareMetric: (name: string, expected: number) => {
        const actual = (debugState.portfolioData.metrics as Record<string, number>)?.[name];
        const diff = actual !== undefined ? Math.abs(actual - expected) : NaN;
        return {
          name,
          expected,
          actual,
          diff,
          match: diff < 0.0001,
        };
      },
      trace: (calculation: string) => debugState.calculations.get(calculation),
      clearCache: handleClearCache,
      exportState: handleExportState,
      setData: setPortfolioData,
      logApi: logAPICall,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__portfolioDebug = windowDebug;
    
    console.log(
      '%c[Debug] Portfolio debug tools loaded. Access via window.__portfolioDebug',
      'color: #22c55e; font-weight: bold'
    );
    console.log('Available methods:', Object.keys(windowDebug));
    
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__portfolioDebug;
    };
  }, [debugEnabled, handleClearCache, handleExportState, handleRunValidation]);
  
  // Don't render if debug mode is disabled
  if (!debugEnabled) return null;
  
  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        title="Open Debug Panel"
      >
        <Bug className="h-5 w-5" />
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 text-[10px] px-1 py-0"
        >
          DEV
        </Badge>
      </motion.button>
      
      {/* Debug Panel Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[540px] sm:max-w-[90vw] p-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                Portfolio Debug Panel
              </SheetTitle>
              <Badge variant="outline" className="text-xs">
                {Object.keys(debugState.portfolioData).length} data keys
              </Badge>
            </div>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-2 h-auto py-1">
              <TabsTrigger value="inspector" className="text-xs gap-1">
                <Database className="h-3 w-3" />
                Inspector
              </TabsTrigger>
              <TabsTrigger value="api" className="text-xs gap-1">
                <Activity className="h-3 w-3" />
                API Logs
              </TabsTrigger>
              <TabsTrigger value="calc" className="text-xs gap-1">
                <Calculator className="h-3 w-3" />
                Trace
              </TabsTrigger>
              <TabsTrigger value="actions" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Actions
              </TabsTrigger>
              <TabsTrigger value="validation" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                Validate
              </TabsTrigger>
            </TabsList>
            
            {/* Data Inspector Tab */}
            <TabsContent value="inspector" className="flex-1 m-0 p-0">
              <ScrollArea className="h-[calc(100vh-140px)]">
                <div className="p-4 font-mono text-xs">
                  {Object.keys(debugState.portfolioData).length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No portfolio data captured yet</p>
                      <p className="text-xs mt-1">Run an analysis to populate data</p>
                    </div>
                  ) : (
                    Object.entries(debugState.portfolioData).map(([key, value]) => (
                      <TreeNode
                        key={key}
                        name={key}
                        value={value}
                        onCopy={handleCopy}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* API Logs Tab */}
            <TabsContent value="api" className="flex-1 m-0 p-0 flex flex-col">
              <div className="px-4 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Filter by ticker or URL..."
                    value={apiFilter}
                    onChange={(e) => setApiFilter(e.target.value)}
                    className="h-7 text-xs pl-7"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {filteredApiLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No API calls logged</p>
                    </div>
                  ) : (
                    filteredApiLogs.map((log) => (
                      <ApiLogEntry key={log.id} log={log} onCopy={handleCopy} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Calculation Tracer Tab */}
            <TabsContent value="calc" className="flex-1 m-0 p-0">
              <ScrollArea className="h-[calc(100vh-140px)]">
                <div className="p-4 space-y-4">
                  {debugState.calculations.size === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No calculations traced</p>
                      <p className="text-xs mt-1">Use logCalculation() to trace</p>
                    </div>
                  ) : (
                    Array.from(debugState.calculations.entries()).map(([name, steps]) => (
                      <CalculationTrace key={name} name={name} steps={steps} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Quick Actions Tab */}
            <TabsContent value="actions" className="flex-1 m-0 p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={handleClearCache}
                  >
                    <Trash2 className="h-5 w-5" />
                    <span className="text-xs">Clear Cache</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={handleForceRefresh}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-xs">Force Refresh</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={handleExportState}
                  >
                    <Download className="h-5 w-5" />
                    <span className="text-xs">Export State</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={handleInjectTestData}
                  >
                    <FlaskConical className="h-5 w-5" />
                    <span className="text-xs">Inject Test Data</span>
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Console Commands</h4>
                  <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                    <p className="text-muted-foreground">// Available via window.__portfolioDebug</p>
                    <p>getData() <span className="text-muted-foreground">// Get all data</span></p>
                    <p>validate() <span className="text-muted-foreground">// Run validation</span></p>
                    <p>compareMetric('sharpe', 1.5) <span className="text-muted-foreground">// Compare</span></p>
                    <p>trace('volatility') <span className="text-muted-foreground">// Trace calc</span></p>
                    <p>exportState() <span className="text-muted-foreground">// Download JSON</span></p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Debug Settings</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Persist debug mode</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const current = localStorage.getItem('debugMode');
                        localStorage.setItem('debugMode', current === 'true' ? 'false' : 'true');
                        toast({
                          title: current === 'true' ? 'Debug mode disabled' : 'Debug mode enabled',
                          description: 'Refresh page to apply',
                        });
                      }}
                    >
                      Toggle
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Validation Dashboard Tab */}
            <TabsContent value="validation" className="flex-1 m-0 p-0 flex flex-col">
              <div className="px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  {debugState.validationIssues.length} Issues
                </span>
                <Button size="sm" variant="outline" onClick={handleRunValidation}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Run Validation
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {debugState.validationIssues.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No validation issues</p>
                      <p className="text-xs mt-1">Click "Run Validation" to check</p>
                    </div>
                  ) : (
                    debugState.validationIssues.map((issue, idx) => (
                      <ValidationIssueCard key={idx} issue={issue} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ApiLogEntry({ log, onCopy }: { log: APILogEntry; onCopy: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusColor = log.status >= 200 && log.status < 300
    ? 'text-emerald-500'
    : log.status >= 400
    ? 'text-rose-500'
    : 'text-amber-500';
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        
        <Badge variant="outline" className="text-[10px]">
          {log.method}
        </Badge>
        
        <span className={`text-xs font-mono ${statusColor}`}>
          {log.status}
        </span>
        
        {log.ticker && (
          <Badge variant="secondary" className="text-[10px]">
            {log.ticker}
          </Badge>
        )}
        
        <span className="text-xs text-muted-foreground truncate flex-1">
          {log.url.replace(/^https?:\/\/[^/]+/, '')}
        </span>
        
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {log.duration}ms
        </span>
      </button>
      
      {expanded && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="text-xs space-y-2">
            <div>
              <span className="text-muted-foreground">URL:</span>
              <code className="ml-2 text-foreground break-all">{log.url}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>
              <span className="ml-2">{log.timestamp.toLocaleTimeString()}</span>
            </div>
            {log.error && (
              <div className="text-rose-500">
                <span className="font-medium">Error:</span> {log.error}
              </div>
            )}
            {log.responseData && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Response:</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1"
                    onClick={() => onCopy(JSON.stringify(log.responseData, null, 2))}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="bg-background rounded p-2 overflow-auto max-h-32 text-[10px]">
                  {JSON.stringify(log.responseData, null, 2).slice(0, 500)}
                  {JSON.stringify(log.responseData).length > 500 && '...'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalculationTrace({ name, steps }: { name: string; steps: CalculationStep[] }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Calculator className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{name}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {steps.length} steps
        </Badge>
      </button>
      
      {expanded && (
        <div className="border-t">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="px-4 py-2 border-b last:border-b-0 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px]">
                  Step {step.step}
                </Badge>
                <span className="font-medium">{step.name}</span>
              </div>
              <div className="pl-4 space-y-1 text-muted-foreground">
                <div>
                  <span className="text-foreground">Inputs:</span>{' '}
                  {Object.entries(step.inputs).map(([k, v]) => (
                    <span key={k} className="mr-2">
                      {k}=<span className="text-blue-500">{v}</span>
                    </span>
                  ))}
                </div>
                <div>
                  <span className="text-foreground">Formula:</span>{' '}
                  <code className="text-purple-500">{step.formula}</code>
                </div>
                <div>
                  <span className="text-foreground">Result:</span>{' '}
                  <span className="text-emerald-500 font-medium">{step.result}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationIssueCard({ issue }: { issue: ValidationIssue }) {
  const Icon = issue.severity === 'error'
    ? AlertTriangle
    : issue.severity === 'warning'
    ? AlertTriangle
    : CheckCircle;
  
  const colorClass = issue.severity === 'error'
    ? 'border-rose-500/30 bg-rose-500/5'
    : issue.severity === 'warning'
    ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-emerald-500/30 bg-emerald-500/5';
  
  const iconColor = issue.severity === 'error'
    ? 'text-rose-500'
    : issue.severity === 'warning'
    ? 'text-amber-500'
    : 'text-emerald-500';
  
  return (
    <div className={`border rounded-lg p-3 ${colorClass}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {issue.category}
            </Badge>
            <Badge
              variant={issue.severity === 'error' ? 'destructive' : 'secondary'}
              className="text-[10px]"
            >
              {issue.severity}
            </Badge>
          </div>
          <p className="text-sm">{issue.message}</p>
          {issue.suggestion && (
            <p className="text-xs text-muted-foreground mt-1">
              💡 {issue.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
