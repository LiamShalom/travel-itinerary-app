-- Add cost field to itinerary_items table
ALTER TABLE public.itinerary_items 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';