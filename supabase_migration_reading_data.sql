-- Migration: Add rating, difficulty, and reading time to read_books table
-- Run this in Supabase SQL Editor

-- Add rating column (1-5 stars)
ALTER TABLE read_books ADD COLUMN IF NOT EXISTS 
  rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add difficulty rating column
ALTER TABLE read_books ADD COLUMN IF NOT EXISTS 
  difficulty_rating TEXT CHECK (difficulty_rating IN ('쉬움', '적당', '어려움'));

-- Add reading time column (in minutes)
ALTER TABLE read_books ADD COLUMN IF NOT EXISTS 
  reading_time_minutes INTEGER CHECK (reading_time_minutes >= 0);

-- Comment for documentation
COMMENT ON COLUMN read_books.rating IS '별점 (1-5)';
COMMENT ON COLUMN read_books.difficulty_rating IS '난이도 (쉬움/적당/어려움)';
COMMENT ON COLUMN read_books.reading_time_minutes IS '독서 소요 시간 (분)';
