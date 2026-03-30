

## Plan: Yahoo Finance Options Chain (Free, No API Key, No Approval)

**Yahoo Finance** provides full options chains — real bid/ask, volume, open interest, and Greeks — with ~15-minute delay. No API key or account needed. Works immediately.

### What Changes

**1. Rewrite `polygon-options-chain` edge function → `yahoo-options-chain`**
- Create new edge function `yahoo-options-chain/index.ts`
- Fetch expirations: `https://query1.finance.yahoo.com/v7/finance/options/{TICKER}`
- Fetch chain for specific expiration: `https://query1.finance.yahoo.com/v7/finance/options/{TICKER}?date={UNIX_TIMESTAMP}`
- Returns real bid, ask, last price, volume, open interest, implied volatility, and Greeks (delta, gamma, theta, vega) directly from Yahoo
- No API key required

**2. Update `OptionsChainSelector.tsx`**
- Point to new `yahoo-options-chain` edge function
- Remove the "estimated prices" warning banner (data is now real, just delayed)
- Show "15-min delayed" indicator instead

**3. Update `TradeDialog.tsx`**
- Update function invoke call from `polygon-options-chain` to `yahoo-options-chain`

**4. Keep Polygon function as fallback**
- Don't delete — can switch back if needed or use for contract metadata

### Technical Details
- Yahoo Finance options endpoint returns calls and puts arrays with: `strike`, `bid`, `ask`, `lastPrice`, `volume`, `openInterest`, `impliedVolatility`, `delta`, `gamma`, `theta`, `vega`
- Expirations come as unix timestamps; we convert to date strings
- No rate limiting concerns for normal usage
- Edge function handles the fetch server-side to avoid CORS issues

