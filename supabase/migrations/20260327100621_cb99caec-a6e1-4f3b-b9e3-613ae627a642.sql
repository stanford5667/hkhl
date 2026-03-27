
ALTER TABLE public.elite_client_profiles
  ADD COLUMN IF NOT EXISTS investment_purpose text,
  ADD COLUMN IF NOT EXISTS time_horizon text,
  ADD COLUMN IF NOT EXISTS goal_priority text,
  ADD COLUMN IF NOT EXISTS loss_reaction text,
  ADD COLUMN IF NOT EXISTS regret_preference text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS other_accounts text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_accounts_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_asset_mix text,
  ADD COLUMN IF NOT EXISTS has_concentrated_positions boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_options_experience text,
  ADD COLUMN IF NOT EXISTS ethical_exclusions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS international_preference text,
  ADD COLUMN IF NOT EXISTS volatility_preference text,
  ADD COLUMN IF NOT EXISTS crypto_stance text;
