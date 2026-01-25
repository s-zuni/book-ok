
-- Phase 3 Migration: Add observation_data column
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE read_books 
ADD COLUMN IF NOT EXISTS observation_data JSONB;

COMMENT ON COLUMN read_books.observation_data IS 'Parent observations recorded when marking book as read (JSON format: fluency, interest, etc.)';
