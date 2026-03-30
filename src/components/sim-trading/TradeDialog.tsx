import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TickerSearchInput } from './TickerSearchInput';
import { OptionsChainSelector } from './OptionsChainSelector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  cashBalance: number;
  onComplete: () => void;
}

export function TradeDialog({ open, onOpenChange, portfolioId, cashBalance, onComplete }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState('stock');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');

  // Order type
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc'>('gtc');

  // Options - now using live chain data
  const [selectedOptionContract, setSelectedOptionContract] = useState<any>(null);
  const [contracts, setContracts] = useState('');
  const [optionTicker, setOptionTicker] = useState('');

  const handleTickerSelect = useCallback(async (symbol: string, _name: string) => {
    setTicker(symbol);
    setOptionTicker(symbol);
    setPriceError('');
    setLivePrice(null);
    setSelectedOptionContract(null);
    setFetchingPrice(true);
    try {
      const quotes = await getCachedQuotes([symbol]);
      const quote = quotes.get(symbol);
      if (quote && quote.price > 0) {
        setLivePrice(quote.price);
      }
    } catch (_) {}
    setFetchingPrice(false);
  }, []);

  const handleOptionTickerSelect = useCallback((symbol: string, _name: string) => {
    setOptionTicker(symbol);
    setSelectedOptionContract(null);
  }, []);

  const executeTrade = async (instrumentType: string, qty: number, price: number, totalCost: number, optFields: any = {}) => {
    setSubmitting(true);

    if (action === 'buy' && totalCost > cashBalance) {
      toast.error(`Insufficient cash. Need $${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} but only have $${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
      setSubmitting(false);
      return;
    }

    const { error: tradeErr } = await supabase.from('sim_trades').insert({
      portfolio_id: portfolioId,
      ticker: (optFields._underlyingTicker || ticker).toUpperCase(),
      instrument_type: instrumentType,
      action,
      quantity: qty,
      price_at_execution: price,
      total_cost: totalCost,
      option_type: optFields.option_type || null,
      strike_price: optFields.strike_price || null,
      expiration_date: optFields.expiration_date || null,
      contract_multiplier: optFields.contract_multiplier || 1,
    });

    if (tradeErr) {
      toast.error('Failed to execute trade: ' + tradeErr.message);
      setSubmitting(false);
      return;
    }

    const newBalance = action === 'buy' ? cashBalance - totalCost : cashBalance + totalCost;
    const { error: updateErr } = await supabase.from('sim_portfolios').update({ cash_balance: newBalance }).eq('id', portfolioId);

    if (updateErr) {
      toast.error('Trade recorded but balance update failed');
    } else {
      const verb = action === 'buy' ? 'Bought' : 'Sold';
      const desc = instrumentType === 'option'
        ? `${verb} ${qty} ${optFields.option_type} contract(s) of ${(optFields._underlyingTicker || ticker).toUpperCase()} $${optFields.strike_price} @ $${price.toFixed(2)}`
        : `${verb} ${qty} shares of ${ticker.toUpperCase()} @ $${price.toFixed(2)}`;
      toast.success(desc);
    }

    resetForm();
    onComplete();
  };

  const submitPendingOrder = async () => {
    if (!user || !ticker.trim()) return;
    setSubmitting(true);

    const lp = orderType === 'limit' ? parseFloat(limitPrice) : null;
    const sp = orderType === 'stop' ? parseFloat(stopPrice) : null;
    const qty = parseFloat(quantity);

    if (!qty || qty <= 0) { toast.error('Enter valid quantity'); setSubmitting(false); return; }
    if (orderType === 'limit' && (!lp || lp <= 0)) { toast.error('Enter valid limit price'); setSubmitting(false); return; }
    if (orderType === 'stop' && (!sp || sp <= 0)) { toast.error('Enter valid stop price'); setSubmitting(false); return; }

    const { error } = await supabase.from('sim_pending_orders').insert({
      portfolio_id: portfolioId,
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      instrument_type: tab === 'option' ? 'option' : 'stock',
      order_type: orderType,
      side: action,
      quantity: qty,
      limit_price: lp,
      stop_price: sp,
      time_in_force: timeInForce,
      option_type: tab === 'option' && selectedOptionContract ? selectedOptionContract.contract_type : null,
      strike_price: tab === 'option' && selectedOptionContract ? selectedOptionContract.strike_price : null,
      expiration_date: tab === 'option' && selectedOptionContract ? selectedOptionContract.expiration_date : null,
      contract_multiplier: tab === 'option' ? 100 : 1,
    });

    if (error) {
      toast.error('Failed to place order: ' + error.message);
    } else {
      toast.success(`${orderType.toUpperCase()} order placed: ${action.toUpperCase()} ${qty} ${ticker.toUpperCase()}`);
      resetForm();
      onComplete();
    }
    setSubmitting(false);
  };

  const handleStockSubmit = () => {
    if (orderType !== 'market') {
      submitPendingOrder();
      return;
    }
    if (!livePrice || !quantity) return;
    const qty = parseFloat(quantity);
    if (qty <= 0) { toast.error('Enter a valid quantity'); return; }
    executeTrade('stock', qty, livePrice, livePrice * qty);
  };

  const handleOptionSubmit = () => {
    if (!selectedOptionContract || !contracts) {
      toast.error('Select an option contract and enter number of contracts');
      return;
    }
    const numContracts = parseFloat(contracts);
    if (numContracts <= 0) { toast.error('Enter valid number of contracts'); return; }

    // Use mid price for market orders, or ask for buy / bid for sell
    const executionPrice = action === 'buy'
      ? (selectedOptionContract.ask > 0 ? selectedOptionContract.ask : selectedOptionContract.mid)
      : (selectedOptionContract.bid > 0 ? selectedOptionContract.bid : selectedOptionContract.mid);

    if (executionPrice <= 0) {
      toast.error('No valid price available for this contract');
      return;
    }

    const multiplier = selectedOptionContract.shares_per_contract || 100;
    const totalCost = executionPrice * numContracts * multiplier;

    executeTrade('option', numContracts, executionPrice, totalCost, {
      option_type: selectedOptionContract.contract_type,
      strike_price: selectedOptionContract.strike_price,
      expiration_date: selectedOptionContract.expiration_date,
      contract_multiplier: multiplier,
      _underlyingTicker: optionTicker,
    });
  };

  const resetForm = () => {
    setTicker('');
    setOptionTicker('');
    setQuantity('');
    setLivePrice(null);
    setPriceError('');
    setContracts('');
    setSelectedOptionContract(null);
    setOrderType('market');
    setLimitPrice('');
    setStopPrice('');
    setSubmitting(false);
  };

  const stockTotal = livePrice && quantity ? livePrice * parseFloat(quantity || '0') : 0;

  // Option total based on selected contract
  const optionExecutionPrice = selectedOptionContract
    ? (action === 'buy'
      ? (selectedOptionContract.ask > 0 ? selectedOptionContract.ask : selectedOptionContract.mid)
      : (selectedOptionContract.bid > 0 ? selectedOptionContract.bid : selectedOptionContract.mid))
    : 0;
  const optionMultiplier = selectedOptionContract?.shares_per_contract || 100;
  const optionTotal = optionExecutionPrice && contracts
    ? optionExecutionPrice * parseFloat(contracts || '0') * optionMultiplier
    : 0;

  const currentTotal = tab === 'stock' ? stockTotal : optionTotal;
  const insufficientCash = action === 'buy' && currentTotal > cashBalance;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Trade</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execute Paper Trade</DialogTitle>
        </DialogHeader>

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2">
          <Button
            variant={action === 'buy' ? 'default' : 'outline'}
            className={`flex-1 ${action === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}`}
            onClick={() => setAction('buy')}
          >
            Buy
          </Button>
          <Button
            variant={action === 'sell' ? 'default' : 'outline'}
            className={`flex-1 ${action === 'sell' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            onClick={() => setAction('sell')}
          >
            Sell
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Available Cash</span>
          <span className={`font-mono font-medium ${insufficientCash ? 'text-destructive' : 'text-foreground'}`}>
            ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="stock" className="flex-1">Stock</TabsTrigger>
            <TabsTrigger value="option" className="flex-1">Option</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <div>
              <Label>Ticker Symbol</Label>
              <TickerSearchInput
                value={ticker}
                onChange={(v) => { setTicker(v); setLivePrice(null); setPriceError(''); }}
                onSelect={handleTickerSelect}
              />
              {fetchingPrice && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching price...</p>}
              {livePrice !== null && (
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground">Market Price: </span>
                  <span className="font-mono font-medium text-foreground">${livePrice.toFixed(2)}</span>
                </p>
              )}
              {priceError && <p className="text-xs text-destructive mt-1">{priceError}</p>}
            </div>

            {/* Order Type */}
            <div>
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={v => setOrderType(v as 'market' | 'limit' | 'stop')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="stop">Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orderType === 'limit' && (
              <div>
                <Label>Limit Price ($)</Label>
                <Input type="number" step="0.01" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={livePrice ? livePrice.toFixed(2) : '0.00'} />
                <p className="text-xs text-muted-foreground mt-1">
                  {action === 'buy' ? 'Buy when price drops to this level' : 'Sell when price rises to this level'}
                </p>
              </div>
            )}

            {orderType === 'stop' && (
              <div>
                <Label>Stop Price ($)</Label>
                <Input type="number" step="0.01" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder={livePrice ? livePrice.toFixed(2) : '0.00'} />
                <p className="text-xs text-muted-foreground mt-1">
                  {action === 'buy' ? 'Buy when price rises to this level' : 'Sell when price drops to this level'}
                </p>
              </div>
            )}

            {orderType !== 'market' && (
              <div>
                <Label>Time in Force</Label>
                <Select value={timeInForce} onValueChange={v => setTimeInForce(v as 'day' | 'gtc')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gtc">Good 'til Cancelled</SelectItem>
                    <SelectItem value="day">Day Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Shares</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="100" min="1" />
            </div>

            {orderType === 'market' && stockTotal > 0 && (
              <div className={`p-3 rounded-lg ${insufficientCash ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
                <div className="flex justify-between text-sm">
                  <span>Estimated Total</span>
                  <span className="font-mono font-bold">${stockTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {insufficientCash && <p className="text-xs text-destructive mt-1">Insufficient cash for this trade</p>}
              </div>
            )}

            <Button
              onClick={handleStockSubmit}
              disabled={
                submitting ||
                !ticker.trim() ||
                !quantity ||
                (orderType === 'market' && !livePrice) ||
                (orderType === 'market' && action === 'buy' && insufficientCash)
              }
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</>
              ) : orderType === 'market' ? (
                `${action === 'buy' ? 'Buy' : 'Sell'} ${ticker.toUpperCase() || 'Stock'}`
              ) : (
                `Place ${orderType} order`
              )}
            </Button>
          </TabsContent>

          <TabsContent value="option" className="space-y-4 mt-4">
            <div>
              <Label>Underlying Ticker</Label>
              <TickerSearchInput
                value={optionTicker}
                onChange={(v) => { setOptionTicker(v); setSelectedOptionContract(null); }}
                onSelect={handleOptionTickerSelect}
              />
            </div>

            {/* Live Options Chain */}
            <OptionsChainSelector
              underlyingTicker={optionTicker}
              onSelect={setSelectedOptionContract}
              selectedContract={selectedOptionContract}
            />

            {/* Contracts input */}
            {selectedOptionContract && (
              <>
                <div>
                  <Label>Number of Contracts</Label>
                  <Input type="number" value={contracts} onChange={e => setContracts(e.target.value)} placeholder="1" min="1" />
                </div>

                {optionTotal > 0 && (
                  <div className={`p-3 rounded-lg ${insufficientCash ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
                    <div className="flex justify-between text-sm">
                      <span>Total Cost</span>
                      <span className="font-mono font-bold">${optionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contracts} × ${optionExecutionPrice.toFixed(2)} × {optionMultiplier} shares/contract
                      <span className="ml-1">({action === 'buy' ? 'Ask' : 'Bid'} price)</span>
                    </p>
                    {insufficientCash && <p className="text-xs text-destructive mt-1">Insufficient cash for this trade</p>}
                  </div>
                )}

                <Button
                  onClick={handleOptionSubmit}
                  disabled={submitting || !selectedOptionContract || !contracts || (action === 'buy' && insufficientCash)}
                  className="w-full"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</>
                  ) : (
                    `${action === 'buy' ? 'Buy' : 'Sell'} ${selectedOptionContract.contract_type.toUpperCase()} $${selectedOptionContract.strike_price} ${selectedOptionContract.expiration_date}`
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
