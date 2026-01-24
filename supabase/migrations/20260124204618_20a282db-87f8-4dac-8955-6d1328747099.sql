-- Allow public read access to real_world_events for news display
CREATE POLICY "Anyone can read events" 
ON public.real_world_events 
FOR SELECT 
USING (true);