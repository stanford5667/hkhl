
ALTER TABLE public.elite_client_profiles 
ADD COLUMN IF NOT EXISTS income_stability text,
ADD COLUMN IF NOT EXISTS emergency_fund_months text,
ADD COLUMN IF NOT EXISTS annual_income_range text,
ADD COLUMN IF NOT EXISTS debt_level text,
ADD COLUMN IF NOT EXISTS tax_situation text,
ADD COLUMN IF NOT EXISTS liquidity_needs text,
ADD COLUMN IF NOT EXISTS diversification_understanding text,
ADD COLUMN IF NOT EXISTS rebalancing_understanding text,
ADD COLUMN IF NOT EXISTS market_cycle_reaction text,
ADD COLUMN IF NOT EXISTS investment_style text,
ADD COLUMN IF NOT EXISTS income_vs_growth text,
ADD COLUMN IF NOT EXISTS alternative_interest text[];
