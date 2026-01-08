import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  TrendingUp, TrendingDown, RefreshCw, Plus, Minus, Star, StarOff,
  Edit2, Check, X, DollarSign, BarChart3, Newspaper, StickyNote,
  ArrowUpRight, ArrowDownRight, Wallet, Clock, Calendar
} from 'lucide-react';
import { CompanyNotesSection } from '@/components/companies/CompanyNotesSection';
import { CandlestickChart } from '@/components/charts/CandlestickChart';

interface PublicEquityDetailViewProps {
  company: {
    id: string;
    name: string;
    ticker_symbol: string | null;
    exchange: string | null;
    shares_owned: number | null;
    cost_basis: number | null;
    current_price: number | null;
    market_value: number | null;
    industry: string | null;
    company_type: string | null;
  };
  onUpdate: () => void;
}

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  companyName: string;
  pe?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: string;
  dividendYield?: number;
  chartData: { time: string; price: number }[];
}

interface Transaction {
  id: string;
  transaction_type: string;
  shares: number | null;
  price_per_share: number | null;
  total_amount: number | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

export function PublicEquityDetailView({ company, onUpdate }: PublicEquityDetailViewProps) {
  const { user } = useAuth();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit states
  const [editingShares, setEditingShares] = useState(false);
  const [sharesInput, setSharesInput] = useState(company.shares_owned?.toString() || '');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [transactionForm, setTransactionForm] = useState({
    shares: '',
    pricePerShare: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  // Fetch stock quote using cached Finnhub
  const fetchQuote = useCallback(async () => {
    if (!company.ticker_symbol) return;
    
    setIsLoadingQuote(true);
    try {
      const { getCachedFullQuote } = await import('@/services/quoteCacheService');
      const data = await getCachedFullQuote(company.ticker_symbol);
      
      if (data) {
        setQuote({
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          open: data.open,
          high: data.high,
          low: data.low,
          volume: '-',
          marketCap: data.marketCap || '-',
          companyName: data.companyName || company.name,
          chartData: [], // Finnhub free tier doesn't include intraday chart
        });
      }
    } catch (e) {
      console.error('Quote error:', e);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [company.ticker_symbol, company.name]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!company.id || !user) return;
    
    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      console.error('Transactions error:', e);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [company.id, user]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // DISABLED: Auto-refresh removed - user must click Refresh button
  // useEffect(() => {
  //   const interval = setInterval(fetchQuote, 60000);
  //   return () => clearInterval(interval);
  // }, [fetchQuote]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQuote();
    setIsRefreshing(false);
    toast.success('Quote refreshed');
  };

  // Update shares
  const handleUpdateShares = async () => {
    if (!user) return;
    
    const newShares = parseFloat(sharesInput) || 0;
    const currentPrice = quote?.price || company.current_price || 0;
    const newMarketValue = newShares * currentPrice;
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          shares_owned: newShares,
          market_value: newMarketValue,
          current_price: currentPrice,
          price_updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);
      
      if (error) throw error;
      
      toast.success('Shares updated');
      setEditingShares(false);
      onUpdate();
    } catch (e) {
      console.error('Update error:', e);
      toast.error('Failed to update shares');
    }
  };

  // Record transaction
  const handleRecordTransaction = async () => {
    if (!user) return;
    
    const shares = parseFloat(transactionForm.shares);
    const pricePerShare = parseFloat(transactionForm.pricePerShare);
    
    if (!shares || !pricePerShare) {
      toast.error('Please enter valid values');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('asset_transactions')
        .insert({
          company_id: company.id,
          user_id: user.id,
          transaction_type: transactionType,
          shares,
          price_per_share: pricePerShare,
          total_amount: shares * pricePerShare,
          transaction_date: transactionForm.date,
          notes: transactionForm.notes || null,
        });
      
      if (error) throw error;
      
      // Update company shares and cost basis
      const currentShares = company.shares_owned || 0;
      const currentCostBasis = company.cost_basis || 0;
      
      let newShares: number;
      let newCostBasis: number;
      
      if (transactionType === 'buy') {
        newShares = currentShares + shares;
        newCostBasis = currentCostBasis + (shares * pricePerShare);
      } else {
        newShares = Math.max(0, currentShares - shares);
        // Pro-rata reduction of cost basis
        const costPerShare = currentShares > 0 ? currentCostBasis / currentShares : 0;
        newCostBasis = Math.max(0, currentCostBasis - (shares * costPerShare));
      }
      
      const currentPrice = quote?.price || company.current_price || 0;
      
      await supabase
        .from('companies')
        .update({
          shares_owned: newShares,
          cost_basis: newCostBasis,
          market_value: newShares * currentPrice,
          current_price: currentPrice,
          price_updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);
      
      toast.success(`${transactionType === 'buy' ? 'Purchase' : 'Sale'} recorded`);
      setShowTransactionDialog(false);
      setTransactionForm({ shares: '', pricePerShare: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchTransactions();
      onUpdate();
    } catch (e) {
      console.error('Transaction error:', e);
      toast.error('Failed to record transaction');
    }
  };

  // Computed values
  const currentPrice = quote?.price || company.current_price || 0;
  const shares = company.shares_owned || 0;
  const costBasis = company.cost_basis || 0;
  const marketValue = shares * currentPrice;
  const totalGainLoss = marketValue - costBasis;
  const totalGainLossPercent = costBasis > 0 ? (totalGainLoss / costBasis) * 100 : 0;
  const avgCostPerShare = shares > 0 ? costBasis / shares : 0;
  const isPositive = (quote?.change || 0) >= 0;
  const isGainPositive = totalGainLoss >= 0;

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLargeNumber = (value: string | number | undefined) => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    if (isNaN(num)) return value.toString();
    
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };


  return (
    <div className="space-y-6">

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => { setTransactionType('buy'); setShowTransactionDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Buy More
        </Button>
        <Button variant="outline" onClick={() => { setTransactionType('sell'); setShowTransactionDialog(true); }} className="gap-2">
          <Minus className="h-4 w-4" />
          Sell
        </Button>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Price Chart - Hero Section with Candlestick */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {company.ticker_symbol ? (
            <CandlestickChart
              symbol={company.ticker_symbol}
              height={320}
              showVolume={true}
              showRangeSelector={true}
              defaultRange="3M"
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No ticker symbol available for chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Position Card */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Your Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shares */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Shares Owned</span>
              {editingShares ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={sharesInput}
                    onChange={(e) => setSharesInput(e.target.value)}
                    className="w-24 h-8 text-right"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdateShares}>
                    <Check className="h-4 w-4 text-emerald-400" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingShares(false)}>
                    <X className="h-4 w-4 text-rose-400" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setSharesInput(shares.toString()); setEditingShares(true); }}
                  className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors"
                >
                  {shares.toLocaleString()}
                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Avg Cost */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Cost/Share</span>
              <span className="text-foreground font-medium tabular-nums">
                {formatCurrency(avgCostPerShare)}
              </span>
            </div>
            
            {/* Cost Basis */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cost Basis</span>
              <span className="text-foreground font-medium tabular-nums">
                {formatCurrency(costBasis)}
              </span>
            </div>
            
            {/* Current Value */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-muted-foreground">Current Value</span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {formatCurrency(marketValue)}
              </span>
            </div>
            
            {/* Total Gain/Loss */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Gain/Loss</span>
              <div className="text-right">
                <p className={cn(
                  "font-bold tabular-nums",
                  isGainPositive ? "text-emerald-400" : "text-rose-400"
                )}>
                  {isGainPositive ? '+' : ''}{formatCurrency(totalGainLoss)}
                </p>
                <p className={cn(
                  "text-sm tabular-nums",
                  isGainPositive ? "text-emerald-400/70" : "text-rose-400/70"
                )}>
                  {formatPercent(totalGainLossPercent)}
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => setShowTransactionDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Transaction
            </Button>
          </CardContent>
        </Card>

        {/* Key Stats */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingQuote ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Market Cap</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.marketCap || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">P/E Ratio</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.pe?.toFixed(2) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">52-Week High</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.week52High ? formatCurrency(quote.week52High) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">52-Week Low</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.week52Low ? formatCurrency(quote.week52Low) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Volume</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.volume || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Avg Volume</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.avgVolume || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">EPS</p>
                  <p className="text-lg font-semibold text-foreground">{quote?.eps ? formatCurrency(quote.eps) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Dividend Yield</p>
                  <p className="text-lg font-semibold text-foreground">
                    {quote?.dividendYield !== undefined ? `${quote.dividendYield.toFixed(2)}%` : '—'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Transactions, News, Notes */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="transactions" className="gap-2">
            <Clock className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <Button size="sm" onClick={() => setShowTransactionDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-border">
                        <TableCell className="tabular-nums">
                          {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'outline'}>
                            {tx.transaction_type === 'buy' ? 'Buy' : 'Sell'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tx.shares?.toLocaleString() || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tx.price_per_share ? formatCurrency(tx.price_per_share) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {tx.total_amount ? formatCurrency(tx.total_amount) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px] truncate">
                          {tx.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions recorded</p>
                  <Button 
                    variant="link" 
                    onClick={() => setShowTransactionDialog(true)}
                    className="mt-2"
                  >
                    Record your first transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Latest News
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>News integration coming soon</p>
                <p className="text-sm mt-1">Check the Research page for AI-powered news analysis</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <CompanyNotesSection companyId={company.id} />
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record {transactionType === 'buy' ? 'Purchase' : 'Sale'} - {company.ticker_symbol}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={transactionType === 'buy' ? 'default' : 'outline'}
                onClick={() => setTransactionType('buy')}
                className="flex-1"
              >
                Buy
              </Button>
              <Button
                variant={transactionType === 'sell' ? 'default' : 'outline'}
                onClick={() => setTransactionType('sell')}
                className="flex-1"
              >
                Sell
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shares</Label>
                <Input
                  type="number"
                  value={transactionForm.shares}
                  onChange={(e) => setTransactionForm(f => ({ ...f, shares: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Price per Share</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={transactionForm.pricePerShare}
                  onChange={(e) => setTransactionForm(f => ({ ...f, pricePerShare: e.target.value }))}
                  placeholder={currentPrice.toFixed(2)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add a note..."
              />
            </div>
            
            {transactionForm.shares && transactionForm.pricePerShare && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatCurrency(parseFloat(transactionForm.shares) * parseFloat(transactionForm.pricePerShare))}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordTransaction}>
              Record {transactionType === 'buy' ? 'Purchase' : 'Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
