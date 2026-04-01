
# Smart Money Tracker — Build Plan

## Route: `/smart-money`

Isolated section with its own sidebar navigation, Zustand store, and dedicated database tables.

---

## Phase 1: Foundation (Database + Layout + Navigation)

### Database Tables (with RLS)
- `smart_money_insider_trades` — SEC EDGAR insider transaction data (cached)
- `smart_money_institutional_holdings` — 13F filing data (cached)  
- `smart_money_options_flow` — Unusual options activity (cached from Polygon)
- `smart_money_block_trades` — Large block trades detected
- `smart_money_watchlists` — User watchlists (tickers + insiders/funds)
- `smart_money_alerts` — User alert configurations
- `smart_money_alert_history` — Triggered alert log

### Layout
- Dedicated sidebar: Dashboard, Insider Tracker, Options Flow, Block Trades, Institutional, AI Chat, Leaderboards, Alerts, Settings
- Dark/light mode (uses existing theme system)
- Responsive with collapsible sidebar

---

## Phase 2: Data Pipeline (Edge Functions)

### Edge Functions
1. **`smart-money-sec-edgar`** — Fetch insider transactions from SEC EDGAR XBRL/RSS feeds, parse and cache in DB
2. **`smart-money-polygon-options`** — Fetch options aggregates from Polygon, detect unusual volume spikes
3. **`smart-money-block-trades`** — Query Polygon trades endpoint filtered by size (>10k shares or >$1M)
4. **`smart-money-13f-filings`** — Parse 13F institutional holdings from SEC EDGAR

### Caching Strategy
- Insider data: refresh daily via scheduled cron
- Options flow: refresh every 5 min during market hours
- Block trades: near real-time via polling (WebSocket upgrade later)
- 13F: quarterly refresh

---

## Phase 3: Dashboards & UI

### Pages
1. **Dashboard** (`/smart-money`) — Overview cards: today's insider buys, largest block trade, top options trade, market sentiment
2. **Insider Tracker** (`/smart-money/insiders`) — Filterable table of insider transactions with significance highlighting
3. **Options Flow** (`/smart-money/options-flow`) — Unusual options activity table with bullish/bearish sentiment tags
4. **Block Trades** (`/smart-money/block-trades`) — Real-time feed of large trades
5. **Institutional** (`/smart-money/institutional`) — 13F holdings changes with bar charts
6. **Leaderboards** (`/smart-money/leaderboards`) — Top insiders by purchase value, top funds by activity

### Components
- Filterable data tables (TanStack-style with existing shadcn Table)
- Sector heatmap for insider buying concentration
- Charts via Recharts (already installed)

---

## Phase 4: AI Chat Interface

- Route: `/smart-money/ai-chat`
- Lovable AI (Gemini) with tool calling to query the smart money database
- Functions: `get_insider_trades`, `get_options_flow`, `get_block_trades`, `get_institutional_changes`
- Streaming responses with markdown rendering
- Context-aware of all smart money data schema

---

## Phase 5: Alerts & Watchlists

- Watchlist management UI (add/remove tickers, insiders, funds)
- Alert creation: insider buy for ticker, unusual options volume threshold, block trade size
- Notifications via existing email infrastructure (notify.aiassetlabs.com)
- Browser push notifications (optional)

---

## Phase 6: Copy Trading / Signals (Optional)

- Follow specific insiders or funds
- Paper trading simulation with virtual capital
- Performance tracking dashboard
- Signal-only — no actual trade execution

---

## API Keys Needed
- **Polygon.io** — Already have (paid) ✅
- **SEC EDGAR** — Free, no key needed (rate limited to 10 req/sec with User-Agent header) ✅
- **No additional keys required for MVP**

## Disclaimer
Footer disclaimer on all smart money pages: "For informational purposes only. Not financial advice."

---

## Build Order
I'll build Phases 1→2→3→4→5 sequentially, delivering working features at each phase. Phase 6 is optional and can be added later. Shall I proceed?
