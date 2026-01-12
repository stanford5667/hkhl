-- Performance indexes for frequently queried tables

-- saved_portfolios: queried by user_id with updated_at ordering
CREATE INDEX IF NOT EXISTS idx_saved_portfolios_user_updated 
ON public.saved_portfolios(user_id, updated_at DESC);

-- synced_positions: queried by user_id + portfolio_id with symbol ordering
CREATE INDEX IF NOT EXISTS idx_synced_positions_user_portfolio 
ON public.synced_positions(user_id, portfolio_id);

CREATE INDEX IF NOT EXISTS idx_synced_positions_portfolio_symbol 
ON public.synced_positions(portfolio_id, symbol);

-- market_daily_bars: heavily queried by ticker and date range
CREATE INDEX IF NOT EXISTS idx_market_daily_bars_ticker_date 
ON public.market_daily_bars(ticker, bar_date DESC);

-- ticker_correlations: queried by ticker pairs and period
CREATE INDEX IF NOT EXISTS idx_ticker_correlations_tickers_period 
ON public.ticker_correlations(ticker_a, ticker_b, period_days);

-- tasks: queried by organization with due_date ordering
CREATE INDEX IF NOT EXISTS idx_tasks_org_due 
ON public.tasks(organization_id, due_date ASC NULLS LAST) 
WHERE is_template = false;

-- companies: queried by organization with name ordering  
CREATE INDEX IF NOT EXISTS idx_companies_org_name 
ON public.companies(organization_id, name);

-- profiles: queried by user_id (should be fast but let's ensure)
CREATE INDEX IF NOT EXISTS idx_profiles_user 
ON public.profiles(user_id);

-- investment_plans: queried by user_id and status
CREATE INDEX IF NOT EXISTS idx_investment_plans_user_status 
ON public.investment_plans(user_id, status);

-- organization_members: queried by user_id and status
CREATE INDEX IF NOT EXISTS idx_org_members_user_status 
ON public.organization_members(user_id, status);

-- alerts: queried with created_at ordering
CREATE INDEX IF NOT EXISTS idx_alerts_created 
ON public.alerts(created_at DESC);

-- calculation_cache: queried by portfolio_hash for cache lookups
CREATE INDEX IF NOT EXISTS idx_calculation_cache_hash 
ON public.calculation_cache(portfolio_hash);

-- asset_universe: frequently searched by ticker
CREATE INDEX IF NOT EXISTS idx_asset_universe_ticker 
ON public.asset_universe(ticker);

-- documents: queried by company_id
CREATE INDEX IF NOT EXISTS idx_documents_company 
ON public.documents(company_id);