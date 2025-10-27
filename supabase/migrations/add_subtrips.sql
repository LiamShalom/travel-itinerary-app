-- Migration: Add subtrips functionality
-- This migration adds the subtrips table and updates itinerary_items to reference subtrips

-- Create subtrips table
CREATE TABLE IF NOT EXISTS public.subtrips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subtrip_id column to itinerary_items table
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS subtrip_id UUID REFERENCES public.subtrips(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subtrips_trip_id ON public.subtrips(trip_id);
CREATE INDEX IF NOT EXISTS idx_subtrips_dates ON public.subtrips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_subtrip_id ON public.itinerary_items(subtrip_id);

-- Enable Row Level Security
ALTER TABLE public.subtrips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subtrips table
CREATE POLICY "Users can view own subtrips"
  ON public.subtrips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = subtrips.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own subtrips"
  ON public.subtrips FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = subtrips.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own subtrips"
  ON public.subtrips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = subtrips.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own subtrips"
  ON public.subtrips FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = subtrips.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_subtrips_updated_at
  BEFORE UPDATE ON public.subtrips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
