import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  cashBalance: number;
  onComplete: () => void;
}

export function TradeDialog({ open, onOpenChange, portfolioId, cashBalance, onComplete }: Props) {
  const [tab, setTab] = useState('stock');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Options fields
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [strikePrice, setStrikePrice] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [premium, setPremium] = useState('');
  const [contracts, setContracts] = useState('');

  const fetchPrice = async () => {
    if (!ticker.trim()) return;
    setFetchingPrice(true);
    try {
      const quotes = await getCachedQuotes([ticker.toUpperCase()]);
      const quote = quotes.get(ticker.toUpperCase());
      if (quote) {
        setLivePrice(quote.price ?? null);
      } else {
        toast.error('Could not find price for ' + ticker);
      }
    } catch {
      toast.error('Failed to fetch price');
    }
    setFetchingPrice(false);
  };

  const handleStockSubmit = async () => {
    if (!ticker.trim() || !quantity || !livePrice) return;
    setSubmitting(true);

    const qty = parseFloat(quantity);
    const totalCost = livePrice * qty;

    if (action === 'buy' && totalCost > cashBalance) {
      toast.error('Insufficient cash balance');
      setSubmitting(false);
      return;
    }

    const { error: tradeErr } = await supabase.from('sim_trades').insert({
      portfolio_id: portfolioId,
      ticker: ticker.toUpperCase(),
      instrument_type: 'stock',
      action,
      quantity: qty,
      price_at_execution: livePrice,
      total_cost: totalCost,
    });

    if (tradeErr) {
      toast.error('Failed to execute trade');
      setSubmitting(false);
      return;
    }

    const newBalance = action === 'buy' ? cashBalance - totalCost : cashBalance + totalCost;
    await supabase.from('sim_portfolios').update({ cash_balance: newBalance }).eq('id', portfolioId);

    toast.success(`${action === 'buy' ? 'Bought' : 'Sold'} ${qty} shares of ${ticker.toUpperCase()} @ $${livePrice.toFixed(2)}`);
    resetForm();
    onComplete();
  };

  const handleOptionSubmit = async () => {
    if (!ticker.trim() || !contracts || !premium || !strikePrice || !expirationDate) return;
    setSubmitting(true);

    const numContracts = parseFloat(contracts);
    const premiumVal = parseFloat(premium);
    const totalCost = premiumVal * numContracts * 100;

    if (action === 'buy' && totalCost > cashBalance) {
      toast.error('Insufficient cash balance');
      setSubmitting(false);
      return;
    }

    const { error: tradeErr } = await supabase.from('sim_trades').insert({
      portfolio_id: portfolioId,
      ticker: ticker.toUpperCase(),
      instrument_type: 'option',
      action,
      quantity: numContracts,
      price_at_execution: premiumVal,
      total_cost: totalCost,
      option_type: optionType,
      strike_price: parseFloat(strikePrice),
      expiration_date: expirationDate,
      contract_multiplier: 100,
    });

    if (tradeErr) {
      toast.error('Failed to execute trade');
      setSubmitting(false);
      return;
    }

    const newBalance = action === 'buy' ? cashBalance - totalCost : cashBalance + totalCost;
    await supabase.from('sim_portfolios').update({ cash_balance: newBalance }).eq('id', portfolioId);

    toast.success(`${action === 'buy' ? 'Bought' : 'Sold'} ${numContracts} ${optionType} contracts of ${ticker.toUpperCase()}`);
    resetForm();
    onComplete();
  };

  const resetForm = () => {
    setTicker('');
    setQuantity('');
    setLivePrice(null);
    setPremium('');
    setContracts('');
    setStrikePrice('');
    setExpirationDate('');
    setSubmitting(false);
  };

  const stockTotal = livePrice && quantity ? livePrice * parseFloat(quantity) : 0;
  const optionTotal = premium && contracts ? parseFloat(premium) * parseFloat(contracts) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Trade</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Execute Trade</DialogTitle>
        </DialogHeader>

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={action === 'buy' ? 'default' : 'outline'}
            className={action === 'buy' ? 'flex-1 bg-success hover:bg-success/90' : 'flex-1'}
            onClick={() => setAction('buy')}
          >
            Buy
          </Button>
          <Button
            variant={action === 'sell' ? 'default' : 'outline'}
            className={action === 'sell' ? 'flex-1 bg-destructive hover:bg-destructive/90' : 'flex-1'}
            onClick={() => setAction('sell')}
          >
            Sell
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-2">Cash Available: ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="stock" className="flex-1">Stock</TabsTrigger>
            <TabsTrigger value="option" className="flex-1">Option</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <div>
              <Label>Ticker</Label>
              <div className="flex gap-2">
                <Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
                <Button variant="outline" size="icon" onClick={fetchPrice} disabled={fetchingPrice}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {livePrice && <p className="text-xs text-muted-foreground mt-1">Live Price: <span className="font-mono text-foreground">${livePrice.toFixed(2)}</span></p>}
            </div>
            <div>
              <Label>Shares</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="100" />
            </div>
            {stockTotal > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">Total: <span className="font-mono font-bold">${stockTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
              </div>
            )}
            <Button onClick={handleStockSubmit} disabled={submitting || !livePrice || !quantity} className="w-full">
              {submitting ? 'Executing...' : `${action === 'buy' ? 'Buy' : 'Sell'} Stock`}
            </Button>
          </TabsContent>

          <TabsContent value="option" className="space-y-4 mt-4">
            <div>
              <Label>Ticker</Label>
              <Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={optionType} onValueChange={v => setOptionType(v as 'call' | 'put')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="put">Put</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Strike ($)</Label>
                <Input type="number" value={strikePrice} onChange={e => setStrikePrice(e.target.value)} placeholder="150" />
              </div>
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Premium ($)</Label>
                <Input type="number" step="0.01" value={premium} onChange={e => setPremium(e.target.value)} placeholder="3.50" />
              </div>
              <div>
                <Label>Contracts</Label>
                <Input type="number" value={contracts} onChange={e => setContracts(e.target.value)} placeholder="1" />
              </div>
            </div>
            {optionTotal > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">Total: <span className="font-mono font-bold">${optionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                <p className="text-xs text-muted-foreground">{contracts} × {premium} × 100 shares</p>
              </div>
            )}
            <Button onClick={handleOptionSubmit} disabled={submitting || !ticker || !premium || !contracts || !strikePrice || !expirationDate} className="w-full">
              {submitting ? 'Executing...' : `${action === 'buy' ? 'Buy' : 'Sell'} Option`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
