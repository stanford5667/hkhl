-- Create company_type enum
CREATE TYPE public.company_type AS ENUM ('pipeline', 'portfolio', 'prospect', 'passed');

-- Create contact_category enum
CREATE TYPE public.contact_category AS ENUM ('lender', 'executive', 'board', 'legal', 'vendor', 'team', 'other');

-- Create document_status enum
CREATE TYPE public.document_status AS ENUM ('needs_review', 'approved', 'pending', 'rejected');

-- Add new columns to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS company_type company_type DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'sourcing',
  ADD COLUMN IF NOT EXISTS revenue_ltm numeric,
  ADD COLUMN IF NOT EXISTS ebitda_ltm numeric,
  ADD COLUMN IF NOT EXISTS deal_lead uuid REFERENCES auth.users(id);

-- Create contacts table
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  title text,
  category contact_category DEFAULT 'other',
  lender_type text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contacts
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update documents table to add status and owner
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS doc_status document_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notes text;

-- Add version column to models if not exists
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;