-- Add membership tier column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free' CHECK (membership_tier IN ('free', 'pro'));