-- Add is_premium column to chat_rooms table
ALTER TABLE chat_rooms ADD COLUMN is_premium boolean DEFAULT false;