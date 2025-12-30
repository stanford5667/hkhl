-- ============================================
-- COMPANY AI SUMMARIES (for generated insights)
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Summary content
  summary_type TEXT NOT NULL CHECK (summary_type IN ('overview', 'investment_thesis', 'risks', 'highlights', 'key_metrics')),
  content TEXT NOT NULL,
  
  -- Structure for highlights/risks
  items JSONB DEFAULT '[]',
  
  -- Source documents used
  source_document_ids UUID[] DEFAULT '{}',
  
  -- Generation info
  model_used TEXT DEFAULT 'gemini-2.5-flash',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for company + type
  UNIQUE(company_id, summary_type)
);

-- ============================================
-- ADD PROCESSING STATUS TO DOCUMENTS
-- ============================================
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_summaries_company ON public.company_ai_summaries(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_type ON public.company_ai_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.company_ai_summaries ENABLE ROW LEVEL SECURITY;

-- Users can view summaries for their companies
CREATE POLICY "Users can view their company summaries" 
  ON public.company_ai_summaries 
  FOR SELECT 
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- Users can create summaries for their companies
CREATE POLICY "Users can create summaries for their companies" 
  ON public.company_ai_summaries 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- Users can update their summaries
CREATE POLICY "Users can update their summaries" 
  ON public.company_ai_summaries 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their summaries
CREATE POLICY "Users can delete their summaries" 
  ON public.company_ai_summaries 
  FOR DELETE 
  USING (auth.uid() = user_id);