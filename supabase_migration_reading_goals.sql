-- Migration: Add reading_goals table for tracking reading goals
-- Run this in Supabase SQL Editor

-- Create reading_goals table
CREATE TABLE IF NOT EXISTS reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('weekly', 'monthly')),
    target_books INTEGER NOT NULL CHECK (target_books > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reading_goals_user ON reading_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_goals_child ON reading_goals(child_id);
CREATE INDEX IF NOT EXISTS idx_reading_goals_active ON reading_goals(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own goals
CREATE POLICY "Users can view their own reading goals" 
ON reading_goals FOR SELECT 
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own goals
CREATE POLICY "Users can insert their own reading goals" 
ON reading_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own goals
CREATE POLICY "Users can update their own reading goals" 
ON reading_goals FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own goals
CREATE POLICY "Users can delete their own reading goals" 
ON reading_goals FOR DELETE 
USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE reading_goals IS '독서 목표 테이블';
COMMENT ON COLUMN reading_goals.goal_type IS '목표 유형 (weekly/monthly)';
COMMENT ON COLUMN reading_goals.target_books IS '목표 권수';
COMMENT ON COLUMN reading_goals.is_active IS '활성 목표 여부';

