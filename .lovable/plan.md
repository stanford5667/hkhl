

## Simulation Trading Platform — Implementation Plan

### What Gets Built
A paper trading platform at `/sim-trading` where users create virtual portfolios, execute buy/sell trades on stocks and options at live market prices, and track real P&L going forward from trade date. No backward-looking data, no pricing models — just actual price tracking.

### Database (3 tables + RLS)

**`sim_portfolios`**
- id (uuid, PK), user_id (uuid, references auth.users), name (text), initial_capital (numeric, default 100000), cash_balance (numeric, default 100000), status (text: active/closed), created_at, closed_at

**`sim_trades`**
- id (uuid, PK), portfolio_id (uuid, FK → sim_portfolios), ticker (text), instrument_type (text: stock/option), action (text: buy/sell), quantity (numeric), price_at_execution (numeric), total_cost (numeric), option_type (text, nullable: call/put), strike_price (numeric, nullable), expiration_date (date, nullable), contract_multiplier (integer, default 100), executed_at (timestamptz)

**`sim_snapshots`**
- id (uuid, PK), portfolio_id (uuid, FK), snapshot_date (date), total_value (numeric), cash_balance (numeric), positions_value (numeric), created_at

RLS on all three: authenticated users can only CRUD their own data (via `user_id` on portfolios, joined through portfolio_id on trades/snapshots).

### Core P&L Logic (Frontend)

For each open position, the system calculates:

**Stocks:**
- Cost basis = `price_at_execution × shares`
- Current value = `live_price × shares`
- P&L = current value - cost basis

**Options:**
- Cost basis = `premium_paid × contracts × 100`
- Current value = `current_premium × contracts × 100`
- P&L = current value - cost basis

When user **sells**, a closing trade is recorded at the sell price. Cash balance updates: buying deducts, selling adds. The system uses `getCachedQuotes` for live stock prices. Options premiums are entered manually at trade time (no options chain API).

### Edge Function: `sim-portfolio-snapshot`
- Accepts a portfolio_id, fetches all open positions, gets live quotes for stock tickers
- Calculates total portfolio value = cash + sum of position values
- Inserts a row into `sim_snapshots`
- Called when user loads their simulation detail page

### Frontend Components

1. **`src/pages/SimTrading.tsx`** — Main page at `/sim-trading`
   - Create new simulation (name + starting capital)
   - List active/closed simulations with summary cards showing total return, days active, current value

2. **`src/components/sim-trading/SimPortfolioDetail.tsx`** — Detail view
   - Holdings table: ticker, type (stock/option), quantity, avg cost, current price, P&L, P&L %
   - Options show strike, expiry, call/put alongside standard columns
   - Cash balance display
   - Equity curve chart from snapshots
   - Trade history log

3. **`src/components/sim-trading/TradeDialog.tsx`** — Execute trades
   - Two tabs: **Stocks** and **Options**
   - Stocks: ticker input, buy/sell toggle, shares input, live price auto-fetched via `getCachedQuotes`, shows total cost preview
   - Options: ticker, call/put, strike, expiration, premium (manual entry), contracts, buy/sell
   - Validates sufficient cash before buying
   - On submit: inserts into `sim_trades`, updates `cash_balance` on portfolio

4. **`src/components/sim-trading/PositionsTable.tsx`** — Live holdings with real-time P&L
   - Fetches live quotes on load/refresh for all stock tickers in portfolio
   - Color-coded P&L (green/red)
   - Close position button (creates a sell trade)

### Navigation
- Add "Sim Trading" to sidebar nav items in `Sidebar.tsx` after Portfolio Builder
- Add route `/sim-trading` in `App.tsx`
- Icon: `Activity` from lucide-react

### Implementation Order
1. Database migration (3 tables + RLS policies)
2. Edge function `sim-portfolio-snapshot`
3. SimTrading page with create/list
4. TradeDialog with buy/sell for stocks + options
5. PositionsTable with live P&L
6. Portfolio detail view with equity curve
7. Wire into sidebar + routing

