-- Create company_notes table for the notes system
CREATE TABLE public.company_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add role column to contacts for company-specific roles
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role_at_company TEXT;

-- Enable RLS on company_notes
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_notes
CREATE POLICY "Users can view notes for their companies" 
ON public.company_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_notes.company_id 
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create notes for their companies" 
ON public.company_notes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_notes.company_id 
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notes" 
ON public.company_notes 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes" 
ON public.company_notes 
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_notes_updated_at
BEFORE UPDATE ON public.company_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_company_notes_company_id ON public.company_notes(company_id);
CREATE INDEX idx_company_notes_pinned ON public.company_notes(pinned DESC, created_at DESC);