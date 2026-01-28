-- Allow public read access to earnings predictions (AI-generated content)
CREATE POLICY "Anyone can read earnings predictions" 
ON public.earnings_predictions 
FOR SELECT 
USING (true);