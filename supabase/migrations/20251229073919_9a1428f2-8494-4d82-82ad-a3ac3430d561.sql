-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create models table to store saved financial models
CREATE TABLE public.models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model_type TEXT NOT NULL, -- 'cash_flow_buildup', 'lbo', 'dcf', 'pro_forma', 'merger', 'cam'
  name TEXT NOT NULL,
  model_data JSONB, -- Full model results
  assumptions JSONB, -- Model assumptions
  historical_data JSONB, -- Historical financials
  interview_responses JSONB, -- User interview answers
  status TEXT DEFAULT 'draft', -- 'draft', 'final'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for data room
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT, -- 'xlsx', 'pdf', 'docx', etc.
  file_size INTEGER,
  folder TEXT DEFAULT 'General', -- 'Financial', 'Legal', 'Operations', etc.
  subfolder TEXT, -- 'Historical', 'Projections', 'Audit', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deals table for pipeline
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  stage TEXT DEFAULT 'sourcing', -- 'sourcing', 'screening', 'diligence', 'ic', 'closing', 'closed'
  deal_value NUMERIC,
  enterprise_value NUMERIC,
  revenue NUMERIC,
  ebitda NUMERIC,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  assigned_to TEXT,
  next_step TEXT,
  next_step_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);

-- Models policies
CREATE POLICY "Users can view own models" ON public.models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own models" ON public.models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models" ON public.models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models" ON public.models
  FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Deals policies
CREATE POLICY "Users can view own deals" ON public.deals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deals" ON public.deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals" ON public.deals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals" ON public.deals
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();