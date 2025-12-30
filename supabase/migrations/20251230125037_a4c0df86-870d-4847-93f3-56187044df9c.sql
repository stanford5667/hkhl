-- Company data fields with source tracking
CREATE TABLE public.company_data_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Field identification
  field_name TEXT NOT NULL,
  field_category TEXT NOT NULL,
  
  -- The actual value
  value JSONB NOT NULL,
  value_type TEXT NOT NULL,
  
  -- Source tracking
  source_type TEXT NOT NULL,
  source_id UUID,
  source_name TEXT,
  source_url TEXT,
  source_excerpt TEXT,
  
  -- Confidence & verification
  confidence DECIMAL(3,2) DEFAULT 0.5,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  
  -- Metadata
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id, field_name)
);

-- Index for fast lookups
CREATE INDEX idx_company_fields ON public.company_data_fields(company_id, field_name);
CREATE INDEX idx_company_category ON public.company_data_fields(company_id, field_category);

-- Store extraction history (for audit trail)
CREATE TABLE public.extraction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  extraction_type TEXT NOT NULL,
  source_name TEXT,
  fields_extracted INTEGER DEFAULT 0,
  fields_updated INTEGER DEFAULT 0,
  status TEXT,
  error_message TEXT,
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extraction_history_company ON public.extraction_history(company_id);

-- Enable RLS
ALTER TABLE public.company_data_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_data_fields
CREATE POLICY "Users can view their company data fields" ON public.company_data_fields
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their company data fields" ON public.company_data_fields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their company data fields" ON public.company_data_fields
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their company data fields" ON public.company_data_fields
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for extraction_history
CREATE POLICY "Users can view their extraction history" ON public.extraction_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their extraction history" ON public.extraction_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_data_fields_updated_at
  BEFORE UPDATE ON public.company_data_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();