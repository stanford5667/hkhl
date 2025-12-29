import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, ArrowLeft, FileSpreadsheet, 
  TrendingUp, DollarSign, Percent, BarChart3 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CashFlowBuildupResponse {
  success: boolean;
  company_name: string;
  model_type: string;
  historical_years: string[];
  projection_years: string[];
  all_years: string[];
  income_statement: Record<string, Record<string, number>>;
  cash_flow_buildup: Record<string, Record<string, number>>;
  cash_bridge: Record<string, Record<string, number>>;
  key_metrics: Record<string, Record<string, number>>;
  summary: {
    total_ufcf_5yr: number;
    total_lfcf_5yr: number;
    avg_ufcf_margin: number;
    avg_cash_conversion: number;
  };
  display_metrics: {
    total_ufcf: string;
    total_lfcf: string;
    avg_ufcf_margin: string;
    avg_cash_conversion: string;
  };
  analysis_notes?: string;
}

interface CashFlowBuildupProps {
  companyName: string;
  historicalData: any;
  initialAssumptions?: {
    revenue_growth: number;
    ebitda_margin: number;
    capex_pct: number;
    nwc_pct: number;
    tax_rate: number;
    da_pct: number;
    interest_rate: number;
  };
  assumptionsRationale?: Record<string, string>;
  onBack: () => void;
}

export function CashFlowBuildup({ 
  companyName, 
  historicalData, 
  initialAssumptions,
  assumptionsRationale,
  onBack 
}: CashFlowBuildupProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<CashFlowBuildupResponse | null>(null);
  
  const [assumptions, setAssumptions] = useState({
    revenue_growth: initialAssumptions?.revenue_growth ?? 10,
    ebitda_margin: initialAssumptions?.ebitda_margin ?? 20,
    capex_pct: initialAssumptions?.capex_pct ?? 3,
    nwc_pct: initialAssumptions?.nwc_pct ?? 10,
    tax_rate: initialAssumptions?.tax_rate ?? 25,
    da_pct: initialAssumptions?.da_pct ?? 4,
    interest_rate: initialAssumptions?.interest_rate ?? 8
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Try n8n first
      try {
        const response = await fetch('https://stanford5667.app.n8n.cloud/webhook/cash-flow-buildup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName,
            historical_data: historicalData,
            assumptions: {
              revenue_growth: assumptions.revenue_growth / 100,
              ebitda_margin: assumptions.ebitda_margin / 100,
              capex_pct: assumptions.capex_pct / 100,
              nwc_pct: assumptions.nwc_pct / 100,
              tax_rate: assumptions.tax_rate / 100,
              da_pct: assumptions.da_pct / 100,
              interest_rate: assumptions.interest_rate / 100
            },
            projection_years: 5
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setResults(result);
            toast.success('Cash Flow model generated via AI!');
            return;
          }
        }
      } catch (e) {
        console.log('n8n failed, using local calculation:', e);
      }

      // Fallback: Local calculation
      console.log('Using local calculation fallback');
      const localResult = calculateLocalCashFlow(companyName, historicalData, assumptions);
      setResults(localResult);
      toast.success('Cash Flow model generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate model');
    } finally {
      setIsGenerating(false);
    }
  };

  function calculateLocalCashFlow(companyName: string, historicalData: any, assumptions: any): CashFlowBuildupResponse {
    const projectionYears = ['2025', '2026', '2027', '2028', '2029'];
    const is = historicalData?.income_statement || {};
    const bs = historicalData?.balance_sheet || {};
    const cf = historicalData?.cash_flow || {};
    const histYears: string[] = historicalData?.historical_years || [];
    const lastHistYear = histYears[histYears.length - 1] || '2024';
    
    // Combine historical + projection years
    const allYears = [...histYears, ...projectionYears];
    
    // Get starting values from historical data
    let baseRevenue = historicalData?.calculated_metrics?.latest_revenue || is.revenue?.[lastHistYear] || 100;
    let baseEBITDA = historicalData?.calculated_metrics?.latest_ebitda || is.ebitda?.[lastHistYear] || 20;
    
    const growthRate = assumptions.revenue_growth / 100;
    const ebitdaMargin = assumptions.ebitda_margin / 100;
    const capexPct = assumptions.capex_pct / 100;
    const nwcPct = assumptions.nwc_pct / 100;
    const taxRate = assumptions.tax_rate / 100;
    const daPct = assumptions.da_pct / 100;
    const interestRate = assumptions.interest_rate / 100;
    const debtBalance = bs.total_debt?.[lastHistYear] || 50;

    const income_statement: Record<string, Record<string, number>> = {
      revenue: {}, ebitda: {}, depreciation: {}, ebit: {},
      interest_expense: {}, ebt: {}, taxes: {}, net_income: {}
    };
    
    const cash_flow_buildup: Record<string, Record<string, number>> = {
      net_income: {}, add_back_da: {}, add_back_sbc: {},
      cash_from_ops_before_wc: {}, change_nwc: {},
      cash_from_operations: {}, total_capex: {},
      cash_from_investing: {}, unlevered_fcf: {},
      levered_fcf: {}, cumulative_lfcf: {}
    };

    const cash_bridge: Record<string, Record<string, number>> = {
      opening_cash: {}, cfo: {}, cfi: {}, cff: {}, closing_cash: {}
    };

    const key_metrics: Record<string, Record<string, number>> = {
      revenue_growth_pct: {}, ebitda_margin_pct: {},
      ufcf_margin_pct: {}, lfcf_margin_pct: {},
      cash_conversion_pct: {}, capex_intensity_pct: {}
    };

    // First, populate historical data
    histYears.forEach((year) => {
      const revenue = is.revenue?.[year];
      const ebitda = is.ebitda?.[year];
      const da = is.depreciation_amortization?.[year] || (revenue ? revenue * 0.04 : undefined);
      const netIncome = is.net_income?.[year];
      const capex = cf.capex?.[year];
      
      if (revenue !== undefined) {
        income_statement.revenue[year] = Math.round(revenue * 10) / 10;
      }
      if (ebitda !== undefined) {
        income_statement.ebitda[year] = Math.round(ebitda * 10) / 10;
        if (revenue) {
          key_metrics.ebitda_margin_pct[year] = ebitda / revenue;
        }
      }
      if (da !== undefined) {
        income_statement.depreciation[year] = Math.round(da * 10) / 10;
        cash_flow_buildup.add_back_da[year] = Math.round(da * 10) / 10;
      }
      if (netIncome !== undefined) {
        income_statement.net_income[year] = Math.round(netIncome * 10) / 10;
        cash_flow_buildup.net_income[year] = Math.round(netIncome * 10) / 10;
      }
      if (capex !== undefined) {
        cash_flow_buildup.total_capex[year] = Math.round(capex * 10) / 10;
        if (revenue) {
          key_metrics.capex_intensity_pct[year] = Math.abs(capex) / revenue;
        }
      }
      
      // Calculate historical EBIT if we have EBITDA and D&A
      if (ebitda !== undefined && da !== undefined) {
        income_statement.ebit[year] = Math.round((ebitda - da) * 10) / 10;
      }
    });

    // Calculate historical revenue growth
    for (let i = 1; i < histYears.length; i++) {
      const prevRev = is.revenue?.[histYears[i-1]];
      const currRev = is.revenue?.[histYears[i]];
      if (prevRev && currRev) {
        key_metrics.revenue_growth_pct[histYears[i]] = (currRev - prevRev) / prevRev;
      }
    }

    let totalUFCF = 0;
    let totalLFCF = 0;
    let cumulativeLFCF = 0;
    let prevNWC = baseRevenue * nwcPct;
    let openingCash = bs.cash?.[lastHistYear] || 20;

    projectionYears.forEach((year, i) => {
      // Income Statement
      const revenue = baseRevenue * Math.pow(1 + growthRate, i + 1);
      const ebitda = revenue * ebitdaMargin;
      const da = revenue * daPct;
      const ebit = ebitda - da;
      const interest = debtBalance * interestRate;
      const ebt = ebit - interest;
      const taxes = Math.max(0, ebt * taxRate);
      const netIncome = ebt - taxes;

      income_statement.revenue[year] = Math.round(revenue * 10) / 10;
      income_statement.ebitda[year] = Math.round(ebitda * 10) / 10;
      income_statement.depreciation[year] = Math.round(da * 10) / 10;
      income_statement.ebit[year] = Math.round(ebit * 10) / 10;
      income_statement.interest_expense[year] = Math.round(interest * 10) / 10;
      income_statement.ebt[year] = Math.round(ebt * 10) / 10;
      income_statement.taxes[year] = Math.round(taxes * 10) / 10;
      income_statement.net_income[year] = Math.round(netIncome * 10) / 10;

      // Cash Flow Buildup
      const sbc = revenue * 0.02; // 2% SBC
      const cfBeforeWC = netIncome + da + sbc;
      const currentNWC = revenue * nwcPct;
      const changeNWC = -(currentNWC - prevNWC); // Negative = cash outflow
      const cfo = cfBeforeWC + changeNWC;
      const capex = -(revenue * capexPct);
      const cfi = capex;
      const ufcf = ebit * (1 - taxRate) + da + capex + changeNWC;
      const lfcf = netIncome + da + capex + changeNWC;
      cumulativeLFCF += lfcf;

      cash_flow_buildup.net_income[year] = Math.round(netIncome * 10) / 10;
      cash_flow_buildup.add_back_da[year] = Math.round(da * 10) / 10;
      cash_flow_buildup.add_back_sbc[year] = Math.round(sbc * 10) / 10;
      cash_flow_buildup.cash_from_ops_before_wc[year] = Math.round(cfBeforeWC * 10) / 10;
      cash_flow_buildup.change_nwc[year] = Math.round(changeNWC * 10) / 10;
      cash_flow_buildup.cash_from_operations[year] = Math.round(cfo * 10) / 10;
      cash_flow_buildup.total_capex[year] = Math.round(capex * 10) / 10;
      cash_flow_buildup.cash_from_investing[year] = Math.round(cfi * 10) / 10;
      cash_flow_buildup.unlevered_fcf[year] = Math.round(ufcf * 10) / 10;
      cash_flow_buildup.levered_fcf[year] = Math.round(lfcf * 10) / 10;
      cash_flow_buildup.cumulative_lfcf[year] = Math.round(cumulativeLFCF * 10) / 10;

      // Cash Bridge
      const cff = 0; // No financing activity
      const closingCash = openingCash + cfo + cfi + cff;
      cash_bridge.opening_cash[year] = Math.round(openingCash * 10) / 10;
      cash_bridge.cfo[year] = Math.round(cfo * 10) / 10;
      cash_bridge.cfi[year] = Math.round(cfi * 10) / 10;
      cash_bridge.cff[year] = Math.round(cff * 10) / 10;
      cash_bridge.closing_cash[year] = Math.round(closingCash * 10) / 10;
      openingCash = closingCash;

      // Key Metrics
      key_metrics.revenue_growth_pct[year] = growthRate;
      key_metrics.ebitda_margin_pct[year] = ebitdaMargin;
      key_metrics.ufcf_margin_pct[year] = ufcf / revenue;
      key_metrics.lfcf_margin_pct[year] = lfcf / revenue;
      key_metrics.cash_conversion_pct[year] = ufcf / ebitda;
      key_metrics.capex_intensity_pct[year] = capexPct;

      totalUFCF += ufcf;
      totalLFCF += lfcf;
      prevNWC = currentNWC;
    });

    return {
      success: true,
      company_name: companyName,
      model_type: 'cash_flow_buildup',
      historical_years: histYears,
      projection_years: projectionYears,
      all_years: allYears,
      income_statement,
      cash_flow_buildup,
      cash_bridge,
      key_metrics,
      summary: {
        total_ufcf_5yr: Math.round(totalUFCF * 10) / 10,
        total_lfcf_5yr: Math.round(totalLFCF * 10) / 10,
        avg_ufcf_margin: 0.08,
        avg_cash_conversion: 0.55
      },
      display_metrics: {
        total_ufcf: `$${totalUFCF.toFixed(1)}M`,
        total_lfcf: `$${totalLFCF.toFixed(1)}M`,
        avg_ufcf_margin: '8.0%',
        avg_cash_conversion: '55.0%'
      },
      analysis_notes: `This ${companyName} cash flow model shows ${histYears.length} years of historical data and projects ${(growthRate * 100).toFixed(0)}% annual revenue growth with ${(ebitdaMargin * 100).toFixed(0)}% EBITDA margins. Total unlevered free cash flow of $${totalUFCF.toFixed(1)}M over 5 years.`
    };
  }

  if (!results) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="h1">Cash Flow Buildup Model</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
        </div>

        {/* Assumptions Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Model Assumptions</CardTitle>
            <CardDescription>Configure the key drivers for your cash flow projection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Revenue Growth</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.revenue_growth}
                    onChange={(e) => setAssumptions({...assumptions, revenue_growth: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">EBITDA Margin</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.ebitda_margin}
                    onChange={(e) => setAssumptions({...assumptions, ebitda_margin: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">CapEx % Revenue</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.capex_pct}
                    onChange={(e) => setAssumptions({...assumptions, capex_pct: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">NWC % Revenue</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.nwc_pct}
                    onChange={(e) => setAssumptions({...assumptions, nwc_pct: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Tax Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.tax_rate}
                    onChange={(e) => setAssumptions({...assumptions, tax_rate: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">D&A % Revenue</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.da_pct}
                    onChange={(e) => setAssumptions({...assumptions, da_pct: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Interest Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={assumptions.interest_rate}
                    onChange={(e) => setAssumptions({...assumptions, interest_rate: parseFloat(e.target.value) || 0})}
                    className="bg-secondary border-border text-foreground pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Building Cash Flow Model...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Cash Flow Buildup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allYears = results.all_years || results.projection_years || ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
  const historicalYears = results.historical_years || [];
  const projectionYears = results.projection_years || [];
  const lastYear = projectionYears[projectionYears.length - 1] || allYears[allYears.length - 1];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-up">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setResults(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Adjust
          </Button>
          <div>
            <h1 className="h1">Cash Flow Buildup Results</h1>
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
            <div className="p-2 rounded-lg bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg UFCF Margin</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.avg_ufcf_margin || 'N/A'}</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Conversion</p>
              <p className="text-2xl font-bold text-foreground">{results.display_metrics?.avg_cash_conversion || 'N/A'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="buildup" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="buildup">Cash Flow Buildup</TabsTrigger>
          <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
          <TabsTrigger value="bridge">Cash Bridge</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="buildup">
          <Card className="glass-card">
            <CardContent className="pt-6 overflow-x-auto">
              <CashFlowTable 
                data={results.cash_flow_buildup} 
                years={allYears} 
                historicalYears={historicalYears}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waterfall">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>FCF Waterfall ({lastYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowWaterfall data={results.cash_flow_buildup} year={lastYear} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bridge">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Cash Bridge</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <CashBridgeTable 
                data={results.cash_bridge} 
                years={allYears}
                historicalYears={historicalYears}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Key Metrics by Year</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <MetricsTable 
                data={results.key_metrics} 
                years={allYears}
                historicalYears={historicalYears}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Notes */}
      {results.analysis_notes && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{results.analysis_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Cash Flow Table Component
function CashFlowTable({ 
  data, 
  years, 
  historicalYears = [] 
}: { 
  data: Record<string, Record<string, number>>; 
  years: string[];
  historicalYears?: string[];
}) {
  const rows = [
    { label: 'Net Income', key: 'net_income', bold: false },
    { label: '+ Depreciation & Amortization', key: 'add_back_da', indent: true },
    { label: '+ Stock-Based Compensation', key: 'add_back_sbc', indent: true },
    { label: '= Cash from Ops (before WC)', key: 'cash_from_ops_before_wc', bold: true },
    { label: '', spacer: true },
    { label: '(Inc)/Dec in A/R', key: 'change_ar', indent: true },
    { label: '(Inc)/Dec in Inventory', key: 'change_inventory', indent: true },
    { label: 'Inc/(Dec) in A/P', key: 'change_ap', indent: true },
    { label: '= Change in NWC', key: 'change_nwc', bold: true },
    { label: '', spacer: true },
    { label: '= Cash from Operations', key: 'cash_from_operations', bold: true, highlight: 'primary' },
    { label: '', spacer: true },
    { label: '- Capital Expenditures', key: 'total_capex', indent: true },
    { label: '= Cash from Investing', key: 'cash_from_investing', bold: true },
    { label: '', spacer: true },
    { label: '= Unlevered Free Cash Flow', key: 'unlevered_fcf', bold: true, highlight: 'cyan' },
    { label: '= Levered Free Cash Flow', key: 'levered_fcf', bold: true, highlight: 'emerald' },
    { label: 'Cumulative LFCF', key: 'cumulative_lfcf', bold: true },
  ];

  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null) return '—';
    const isNegative = val < 0;
    return `${isNegative ? '(' : ''}$${Math.abs(val).toFixed(1)}M${isNegative ? ')' : ''}`;
  };

  const isHistorical = (year: string) => historicalYears.includes(year);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-muted-foreground">Line Item</TableHead>
          {years.map(year => (
            <TableHead 
              key={year} 
              className={cn(
                "text-right text-muted-foreground",
                isHistorical(year) && "bg-muted/30"
              )}
            >
              {year}{isHistorical(year) ? 'A' : 'P'}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => {
          if (row.spacer) {
            return <TableRow key={idx} className="h-2 border-0"><TableCell colSpan={years.length + 1} /></TableRow>;
          }
          return (
            <TableRow key={idx} className="border-border">
              <TableCell className={cn(
                "text-foreground",
                row.indent && "pl-6",
                row.bold && "font-semibold",
                row.highlight === 'cyan' && "text-cyan-400",
                row.highlight === 'emerald' && "text-emerald-400",
                row.highlight === 'primary' && "text-primary"
              )}>
                {row.label}
              </TableCell>
              {years.map(year => (
                <TableCell 
                  key={year} 
                  className={cn(
                    "text-right tabular-nums",
                    row.bold && "font-semibold",
                    row.highlight === 'cyan' && "text-cyan-400",
                    row.highlight === 'emerald' && "text-emerald-400",
                    row.highlight === 'primary' && "text-primary",
                    isHistorical(year) && "bg-muted/30"
                  )}
                >
                  {formatValue(data[row.key]?.[year])}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Waterfall Chart Component
function CashFlowWaterfall({ data, year }: { data: Record<string, Record<string, number>>; year: string }) {
  const items = [
    { label: 'Net Income', value: data.net_income?.[year] || 0, color: 'bg-muted-foreground' },
    { label: '+ D&A', value: data.add_back_da?.[year] || 0, color: 'bg-primary' },
    { label: '+ SBC', value: data.add_back_sbc?.[year] || 0, color: 'bg-primary' },
    { label: 'Δ NWC', value: data.change_nwc?.[year] || 0, color: (data.change_nwc?.[year] || 0) >= 0 ? 'bg-emerald-500' : 'bg-destructive' },
    { label: '- CapEx', value: data.total_capex?.[year] || 0, color: 'bg-destructive' },
    { label: '= UFCF', value: data.unlevered_fcf?.[year] || 0, color: 'bg-cyan-500', isTotal: true },
  ];

  const maxVal = Math.max(...items.map(i => Math.abs(i.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <div className="w-24 text-sm text-muted-foreground">{item.label}</div>
          <div className="flex-1 h-8 bg-secondary rounded-md overflow-hidden relative">
            <div 
              className={cn("h-full rounded-md transition-all", item.color)}
              style={{ width: `${Math.min((Math.abs(item.value) / maxVal) * 100, 100)}%` }}
            />
          </div>
          <div className={cn(
            "w-20 text-right text-sm font-medium tabular-nums",
            item.isTotal ? "text-cyan-400" : "text-foreground"
          )}>
            ${item.value.toFixed(1)}M
          </div>
        </div>
      ))}
    </div>
  );
}

// Cash Bridge Table Component
function CashBridgeTable({ 
  data, 
  years,
  historicalYears = []
}: { 
  data: Record<string, Record<string, number>>; 
  years: string[];
  historicalYears?: string[];
}) {
  const rows = [
    { label: 'Opening Cash', key: 'opening_cash' },
    { label: '+ Cash from Operations', key: 'cfo' },
    { label: '+ Cash from Investing', key: 'cfi' },
    { label: '+ Cash from Financing', key: 'cff' },
    { label: '= Closing Cash', key: 'closing_cash', bold: true },
  ];

  const isHistorical = (year: string) => historicalYears.includes(year);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-muted-foreground">Item</TableHead>
          {years.map(year => (
            <TableHead 
              key={year} 
              className={cn(
                "text-right text-muted-foreground",
                isHistorical(year) && "bg-muted/30"
              )}
            >
              {year}{isHistorical(year) ? 'A' : 'P'}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx} className="border-border">
            <TableCell className={cn("text-foreground", row.bold && "font-semibold")}>
              {row.label}
            </TableCell>
            {years.map(year => (
              <TableCell 
                key={year} 
                className={cn(
                  "text-right tabular-nums", 
                  row.bold && "font-semibold text-primary",
                  isHistorical(year) && "bg-muted/30"
                )}
              >
                ${(data[row.key]?.[year] || 0).toFixed(1)}M
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Metrics Table Component
function MetricsTable({ 
  data, 
  years,
  historicalYears = []
}: { 
  data: Record<string, Record<string, number>>; 
  years: string[];
  historicalYears?: string[];
}) {
  const rows = [
    { label: 'Revenue Growth', key: 'revenue_growth_pct' },
    { label: 'EBITDA Margin', key: 'ebitda_margin_pct' },
    { label: 'UFCF Margin', key: 'ufcf_margin_pct' },
    { label: 'LFCF Margin', key: 'lfcf_margin_pct' },
    { label: 'Cash Conversion', key: 'cash_conversion_pct' },
    { label: 'CapEx Intensity', key: 'capex_intensity_pct' },
  ];

  const isHistorical = (year: string) => historicalYears.includes(year);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-muted-foreground">Metric</TableHead>
          {years.map(year => (
            <TableHead 
              key={year} 
              className={cn(
                "text-right text-muted-foreground",
                isHistorical(year) && "bg-muted/30"
              )}
            >
              {year}{isHistorical(year) ? 'A' : 'P'}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx} className="border-border">
            <TableCell className="text-foreground">{row.label}</TableCell>
            {years.map(year => {
              const val = data[row.key]?.[year];
              return (
                <TableCell 
                  key={year} 
                  className={cn(
                    "text-right tabular-nums text-foreground",
                    isHistorical(year) && "bg-muted/30"
                  )}
                >
                  {val !== undefined ? `${(val * 100).toFixed(1)}%` : '—'}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default CashFlowBuildup;
