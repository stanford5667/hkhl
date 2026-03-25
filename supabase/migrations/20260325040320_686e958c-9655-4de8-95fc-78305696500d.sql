
ALTER TABLE public.chat_rooms
  ADD COLUMN is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN live_stream_url text,
  ADD COLUMN live_started_by uuid,
  ADD COLUMN live_started_at timestamptz;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
