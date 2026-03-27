-- Add elite_client to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'elite_client';