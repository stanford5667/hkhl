-- 1. Add columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS enabled_asset_types text[] DEFAULT ARRAY['private_equity'],
ADD COLUMN IF NOT EXISTS default_asset_view text DEFAULT 'all';

-- 2. Add new columns to companies table for multi-asset support
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS asset_class text DEFAULT 'private_equity',
ADD COLUMN IF NOT EXISTS ticker_symbol text,
ADD COLUMN IF NOT EXISTS exchange text,
ADD COLUMN IF NOT EXISTS current_price numeric,
ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS shares_owned numeric,
ADD COLUMN IF NOT EXISTS cost_basis numeric,
ADD COLUMN IF NOT EXISTS market_value numeric;

-- Add check constraint for asset_class
ALTER TABLE public.companies
ADD CONSTRAINT companies_asset_class_check 
CHECK (asset_class IN ('private_equity', 'public_equity', 'real_estate', 'credit', 'other'));

-- 3. Create asset_prices table for historical price tracking
CREATE TABLE public.asset_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  volume numeric,
  market_cap numeric,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on asset_prices
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_prices (users can manage prices for their companies)
CREATE POLICY "Users can view asset prices for their companies"
ON public.asset_prices FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert asset prices for their companies"
ON public.asset_prices FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete asset prices for their companies"
ON public.asset_prices FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Create index for efficient querying
CREATE INDEX idx_asset_prices_company_recorded ON public.asset_prices(company_id, recorded_at DESC);

-- 4. Create asset_transactions table
CREATE TABLE public.asset_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL,
  shares numeric,
  price_per_share numeric,
  total_amount numeric,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraint for transaction_type
ALTER TABLE public.asset_transactions
ADD CONSTRAINT asset_transactions_type_check 
CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'distribution', 'capital_call'));

-- Enable RLS on asset_transactions
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_transactions
CREATE POLICY "Users can view their asset transactions"
ON public.asset_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create asset transactions"
ON public.asset_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their asset transactions"
ON public.asset_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their asset transactions"
ON public.asset_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX idx_asset_transactions_company ON public.asset_transactions(company_id);
CREATE INDEX idx_asset_transactions_user_date ON public.asset_transactions(user_id, transaction_date DESC);

-- 5. Update existing companies to have asset_class = 'private_equity'
UPDATE public.companies SET asset_class = 'private_equity' WHERE asset_class IS NULL;