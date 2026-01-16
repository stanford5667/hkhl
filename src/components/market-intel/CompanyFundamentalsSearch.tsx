/**
 * Company Fundamentals Search Component
 * 
 * Search for any US ticker and display 5 years of Revenue/Net Income
 * with Recharts visualization.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  Radio,
  Globe,
  DollarSign,
  Users,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyFundamentals, useCompanySearch, type IncomeStatement, type CompanyProfile } from '@/hooks/useMarketIntelData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CompanyFundamentalsSearchProps {
  className?: string;
  onPerformanceUpdate?: (loadTimeMs: number, accuracy: number, issues: string[]) => void;
}

export function CompanyFundamentalsSearch({ className, onPerformanceUpdate }: CompanyFundamentalsSearchProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { data: searchResults, query, setQuery, isLoading: searchLoading } = useCompanySearch();
  const { data: fundamentals, isLoading: fundLoading, error } = useCompanyFundamentals(selectedSymbol);
  
  // Track performance
  useEffect(() => {
    if (!fundLoading && fundamentals && onPerformanceUpdate) {
      const issues: string[] = [];
      
      if (error) issues.push('Failed to fetch fundamentals');
      if (fundamentals.useMockData) issues.push('Using demo data');
      if (fundamentals.financials.length < 5) issues.push('Less than 5 years of data');
      
      const accuracy = issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 2);
      onPerformanceUpdate(fundamentals.loadTimeMs, accuracy, issues);
    }
  }, [fundLoading, fundamentals, error, onPerformanceUpdate]);
  
  const handleSearch = (value: string) => {
    setInputValue(value);
    setQuery(value);
    setShowSuggestions(true);
  };
  
  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setInputValue(symbol);
    setShowSuggestions(false);
  };
  
  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };
  
  // Prepare chart data (reverse to show oldest first)
  const chartData = fundamentals?.financials
    ?.slice()
    .reverse()
    .map(f => ({
      year: f.date.split('-')[0],
      Revenue: f.revenue / 1e9,
      'Net Income': f.netIncome / 1e9,
    })) || [];

  return (
    <Card className={cn("bg-secondary/50 border-border", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Company Fundamentals</h3>
              <p className="text-xs text-muted-foreground">
                5-year Revenue & Net Income
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Globe className="h-3 w-3" />
              {fundamentals?.source || 'FMP'}
            </Badge>
            
            {fundamentals && (
              <div className="flex items-center gap-1.5">
                <Radio className={cn(
                  "h-3 w-3",
                  fundamentals.useMockData ? "text-amber-400" : "text-emerald-400"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  fundamentals.useMockData ? "text-amber-400" : "text-emerald-400"
                )}>
                  {fundamentals.useMockData ? 'Demo' : 'Live'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a US ticker (e.g., AAPL, MSFT)..."
              value={inputValue}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10"
            />
          </div>
          
          {/* Suggestions dropdown */}
          {showSuggestions && searchResults?.results && searchResults.results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.results.map((result: any) => (
                <button
                  key={result.symbol}
                  className="w-full px-4 py-2 text-left hover:bg-secondary/50 flex items-center justify-between"
                  onClick={() => handleSelect(result.symbol)}
                >
                  <div>
                    <span className="font-medium">{result.symbol}</span>
                    <span className="text-sm text-muted-foreground ml-2">{result.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{result.exchange}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Loading state */}
        {fundLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        )}
        
        {/* No selection */}
        {!fundLoading && !selectedSymbol && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter a ticker symbol to view fundamentals</p>
            <p className="text-sm mt-1">Try: AAPL, MSFT, GOOGL, AMZN</p>
          </div>
        )}
        
        {/* Company Profile */}
        {!fundLoading && fundamentals?.profile && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold">{fundamentals.profile.companyName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {fundamentals.profile.symbol} • {fundamentals.profile.exchange}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">${fundamentals.profile.price?.toFixed(2) || 'N/A'}</div>
                  <Badge className="bg-primary/20 text-primary">
                    {formatCurrency(fundamentals.profile.marketCap)} Mkt Cap
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sector</p>
                  <p className="font-medium">{fundamentals.profile.sector}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Industry</p>
                  <p className="font-medium">{fundamentals.profile.industry}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CEO</p>
                  <p className="font-medium">{fundamentals.profile.ceo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employees</p>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {fundamentals.profile.employees?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
              
              {fundamentals.profile.website && (
                <a 
                  href={fundamentals.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                >
                  <ExternalLink className="h-3 w-3" />
                  {fundamentals.profile.website}
                </a>
              )}
            </div>
            
            {/* Financials Chart */}
            {chartData.length > 0 && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  5-Year Financial Performance (in $B)
                </h4>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="year" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={(v) => `$${v}B`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`$${value.toFixed(1)}B`, '']}
                      />
                      <Legend />
                      <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Net Income" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Financials Table */}
            <div>
              <h4 className="font-semibold mb-4">Annual Financials</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Year</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Net Income</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">EBITDA</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundamentals.financials.map((f, i) => (
                      <tr key={f.date} className={cn(
                        "border-b border-border/50",
                        i === 0 && "bg-primary/5"
                      )}>
                        <td className="py-2 px-3 font-medium">{f.date.split('-')[0]}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(f.revenue)}</td>
                        <td className={cn(
                          "text-right py-2 px-3",
                          f.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {formatCurrency(f.netIncome)}
                        </td>
                        <td className="text-right py-2 px-3">{formatCurrency(f.ebitda)}</td>
                        <td className="text-right py-2 px-3">${f.eps.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
