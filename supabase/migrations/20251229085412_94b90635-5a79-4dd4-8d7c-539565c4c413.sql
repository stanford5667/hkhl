-- Create document_comments table
CREATE TABLE public.document_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_comments (users can see comments on docs they own)
CREATE POLICY "Users can view comments on their documents"
  ON public.document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_comments.document_id 
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on their documents"
  ON public.document_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id 
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.document_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();