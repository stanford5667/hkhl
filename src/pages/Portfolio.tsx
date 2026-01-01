import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetTypeFilter, useAssetTypeFilter } from '@/components/shared/AssetTypeFilter';
import { useUnifiedData, AssetClass } from '@/contexts/UnifiedDataContext';
import { 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  LineChart,
  Building,
  CreditCard,
  Package
} from "lucide-react";

const ASSET_CLASS_ICONS: Record<AssetClass, React.ElementType> = {
  private_equity: Briefcase,
  public_equity: LineChart,
  real_estate: Building,
  credit: CreditCard,
  other: Package,
};

export default function Portfolio() {
  const { companiesWithRelations, isLoading, dashboardStats, getCompaniesByAssetClass } = useUnifiedData();
  const assetTypeFilter = useAssetTypeFilter();

  // Get holdings (portfolio companies) filtered by asset type
  const holdings = useMemo(() => {
    const filtered = assetTypeFilter === 'all' 
      ? companiesWithRelations
      : getCompaniesByAssetClass(assetTypeFilter as AssetClass);
    return filtered.filter(c => c.company_type === 'portfolio');
  }, [companiesWithRelations, assetTypeFilter, getCompaniesByAssetClass]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalCostBasis = holdings.reduce((sum, c) => sum + (c.cost_basis || 0), 0);
    const totalMarketValue = holdings.reduce((sum, c) => sum + (c.market_value || c.ebitda_ltm || 0), 0);
    const totalGainLoss = totalMarketValue - totalCostBasis;
    const gainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    
    return {
      costBasis: totalCostBasis,
      marketValue: totalMarketValue,
      gainLoss: totalGainLoss,
      gainLossPercent,
      count: holdings.length,
    };
  }, [holdings]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    if (Math.abs(value) >= 1) return `$${value.toFixed(0)}M`;
    return `$${(value * 1000).toFixed(0)}K`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case "monitoring":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Monitor</Badge>;
      case "at-risk":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">At Risk</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Holdings</h1>
          <p className="text-muted-foreground mt-1">
            {holdings.length} active investments across all asset classes
          </p>
        </div>
        <Button variant="outline">Export Report</Button>
      </div>

      {/* Asset Type Filter */}
      <AssetTypeFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Value"
          value={formatCurrency(totals.marketValue)}
          change={totals.gainLossPercent}
          subtitle="vs cost basis"
          icon={<DollarSign className="h-5 w-5" />}
          variant={totals.gainLoss >= 0 ? "success" : "destructive"}
        />
        <MetricCard
          title="Cost Basis"
          value={formatCurrency(totals.costBasis)}
          subtitle="total invested"
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          title="Gain/Loss"
          value={formatCurrency(totals.gainLoss)}
          change={totals.gainLossPercent}
          subtitle="unrealized"
          icon={<TrendingUp className="h-5 w-5" />}
          variant={totals.gainLoss >= 0 ? "success" : "destructive"}
        />
        <MetricCard
          title="Holdings"
          value={`${totals.count}`}
          subtitle="active positions"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      {/* Holdings Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-white">Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No holdings found</p>
              <p className="text-sm mt-1">Add companies with "Portfolio" type to see them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Cost Basis
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Market Value
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Gain/Loss
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Return
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const costBasis = holding.cost_basis || 0;
                    const marketValue = holding.market_value || holding.ebitda_ltm || 0;
                    const gainLoss = marketValue - costBasis;
                    const returnPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                    const assetClass = (holding.asset_class || 'private_equity') as AssetClass;
                    const AssetIcon = ASSET_CLASS_ICONS[assetClass];

                    return (
                      <tr
                        key={holding.id}
                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <Link to={`/companies/${holding.id}`} className="flex items-center gap-3 group">
                            <div className="p-2 rounded-lg bg-slate-800">
                              <AssetIcon className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                                {holding.name}
                              </span>
                              {holding.ticker_symbol && (
                                <span className="text-xs text-slate-500 ml-2">
                                  {holding.ticker_symbol}
                                </span>
                              )}
                              <p className="text-xs text-slate-500">{holding.industry}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-xs capitalize border-slate-700 text-slate-400">
                            {assetClass.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-400">
                          {costBasis > 0 ? formatCurrency(costBasis) : '—'}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-white">
                          {marketValue > 0 ? formatCurrency(marketValue) : '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`flex items-center justify-end gap-1 font-mono ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {gainLoss >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {costBasis > 0 ? formatCurrency(Math.abs(gainLoss)) : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-mono ${returnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {costBasis > 0 ? `${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(holding.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
