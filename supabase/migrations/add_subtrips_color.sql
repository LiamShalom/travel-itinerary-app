-- Migration: Add color column to subtrips table
-- This migration adds the color column to the subtrips table if it doesn't exist

-- Add color column to subtrips table
ALTER TABLE public.subtrips
ADD COLUMN IF NOT EXISTS color TEXT;