-- Fix insecure RLS policies on affected tables
-- This addresses the security findings about PUBLIC_DATA_EXPOSURE and MISSING_RLS

-- 1. Fix portfolio_assets table
DROP POLICY IF EXISTS "Allow all portfolio_assets" ON public.portfolio_assets;
ALTER TABLE public.portfolio_assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own portfolio_assets" ON public.portfolio_assets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolio_assets" ON public.portfolio_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio_assets" ON public.portfolio_assets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio_assets" ON public.portfolio_assets
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Fix portfolio_covenants table
DROP POLICY IF EXISTS "Allow all portfolio_covenants" ON public.portfolio_covenants;
ALTER TABLE public.portfolio_covenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own portfolio_covenants" ON public.portfolio_covenants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolio_covenants" ON public.portfolio_covenants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio_covenants" ON public.portfolio_covenants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio_covenants" ON public.portfolio_covenants
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Fix alerts table
DROP POLICY IF EXISTS "Allow all alerts" ON public.alerts;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Fix events table
DROP POLICY IF EXISTS "Allow all events" ON public.events;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Fix pe_funds table
DROP POLICY IF EXISTS "Allow all pe_funds" ON public.pe_funds;
ALTER TABLE public.pe_funds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own pe_funds" ON public.pe_funds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pe_funds" ON public.pe_funds
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pe_funds" ON public.pe_funds
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pe_funds" ON public.pe_funds
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Fix deal_pipeline table
DROP POLICY IF EXISTS "Allow all deal_pipeline" ON public.deal_pipeline;
ALTER TABLE public.deal_pipeline ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own deal_pipeline" ON public.deal_pipeline
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own deal_pipeline" ON public.deal_pipeline
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deal_pipeline" ON public.deal_pipeline
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deal_pipeline" ON public.deal_pipeline
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Fix ma_transactions table
DROP POLICY IF EXISTS "Allow all ma_transactions" ON public.ma_transactions;
ALTER TABLE public.ma_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own ma_transactions" ON public.ma_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ma_transactions" ON public.ma_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ma_transactions" ON public.ma_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ma_transactions" ON public.ma_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Fix economic_indicators table (this is typically reference data, allow read-only for all authenticated users)
DROP POLICY IF EXISTS "Allow all economic_indicators" ON public.economic_indicators;

CREATE POLICY "Authenticated users can view economic_indicators" ON public.economic_indicators
  FOR SELECT USING (auth.role() = 'authenticated');
-- Only admins/service role should update reference data (no user insert/update/delete policies needed)