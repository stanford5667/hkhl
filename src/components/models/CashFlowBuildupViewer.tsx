import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, FileSpreadsheet, 
  TrendingUp, DollarSign, Percent, BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelData {
  id: string;
  model_type: string;
  name: string;
  model_data: any;
  assumptions: any;
  historical_data: any;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface CashFlowBuildupViewerProps {
  model: ModelData;
  companyName: string;
  onBack: () => void;
}

export function CashFlowBuildupViewer({ model, companyName, onBack }: CashFlowBuildupViewerProps) {
  const results = model.model_data;
  const assumptions = model.assumptions;

  if (!results) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No model data available.</p>
        </Card>
      </div>
    );
  }

  const allYears = results.all_years || results.projection_years || [];
  const historicalYears = results.historical_years || [];
  const projectionYears = results.projection_years || [];

  const formatValue = (val: number | undefined, isPercent = false) => {
    if (val === undefined || val === null) return '—';
    if (isPercent) return `${(val * 100).toFixed(1)}%`;
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}B`;
    return `$${val.toFixed(1)}M`;
  };

  const CashFlowTable = ({ data, title }: { data: Record<string, Record<string, number>>; title: string }) => {
    const rows = Object.entries(data || {}).filter(([_, values]) => 
      Object.values(values).some(v => v !== undefined && v !== null)
    );

    if (rows.length === 0) return null;

    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left min-w-[180px]">Line Item</TableHead>
                  {allYears.map((year: string) => (
                    <TableHead 
                      key={year} 
                      className={cn(
                        "text-right min-w-[80px]",
                        historicalYears.includes(year) && "bg-muted/30"
                      )}
                    >
                      <div>{year}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {historicalYears.includes(year) ? 'A' : 'P'}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([key, values]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium text-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </TableCell>
                    {allYears.map((year: string) => (
                      <TableCell 
                        key={year} 
                        className={cn(
                          "text-right font-mono",
                          historicalYears.includes(year) && "bg-muted/30"
                        )}
                      >
                        {formatValue(values[year])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MetricsTable = ({ data }: { data: Record<string, Record<string, number>> }) => {
    const rows = Object.entries(data || {}).filter(([_, values]) => 
      Object.values(values).some(v => v !== undefined && v !== null)
    );

    if (rows.length === 0) return null;

    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left min-w-[180px]">Metric</TableHead>
                  {allYears.map((year: string) => (
                    <TableHead 
                      key={year} 
                      className={cn(
                        "text-right min-w-[80px]",
                        historicalYears.includes(year) && "bg-muted/30"
                      )}
                    >
                      <div>{year}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {historicalYears.includes(year) ? 'A' : 'P'}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([key, values]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium text-foreground capitalize">
                      {key.replace(/_pct/g, '').replace(/_/g, ' ')}
                    </TableCell>
                    {allYears.map((year: string) => (
                      <TableCell 
                        key={year} 
                        className={cn(
                          "text-right font-mono",
                          historicalYears.includes(year) && "bg-muted/30"
                        )}
                      >
                        {formatValue(values[year], true)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="h1">{model.name}</h1>
            <p className="text-muted-foreground">
              {companyName} • {historicalYears.length > 0 ? `${historicalYears.length}yr Historical + ` : ''}{projectionYears.length}yr Projection
            </p>
          </div>
        </div>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Sheets
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <DollarSign className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total UFCF (5yr)</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.total_ufcf || '$0M'}</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total LFCF (5yr)</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.total_lfcf || '$0M'}</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Percent className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg UFCF Margin</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.avg_ufcf_margin || '0%'}</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Conversion</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.avg_cash_conversion || '0%'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Assumptions Summary */}
      {assumptions && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Model Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Growth</p>
                <p className="font-mono text-foreground">{assumptions.revenue_growth?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">EBITDA Margin</p>
                <p className="font-mono text-foreground">{assumptions.ebitda_margin?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CapEx %</p>
                <p className="font-mono text-foreground">{assumptions.capex_pct?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NWC %</p>
                <p className="font-mono text-foreground">{assumptions.nwc_pct?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax Rate</p>
                <p className="font-mono text-foreground">{assumptions.tax_rate?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">D&A %</p>
                <p className="font-mono text-foreground">{assumptions.da_pct?.toFixed(1) || '—'}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="font-mono text-foreground">{assumptions.interest_rate?.toFixed(1) || '—'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Tables */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow Buildup</TabsTrigger>
          <TabsTrigger value="bridge">Cash Bridge</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <CashFlowTable data={results.income_statement} title="Income Statement ($M)" />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowTable data={results.cash_flow_buildup} title="Cash Flow Buildup ($M)" />
        </TabsContent>

        <TabsContent value="bridge">
          <CashFlowTable data={results.cash_bridge} title="Cash Bridge ($M)" />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsTable data={results.key_metrics} />
        </TabsContent>
      </Tabs>

      {/* Analysis Notes */}
      {results.analysis_notes && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Analysis Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{results.analysis_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
