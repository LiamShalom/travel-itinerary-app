-- Add new comprehensive itinerary item types
-- Drop the old constraint
ALTER TABLE public.itinerary_items 
DROP CONSTRAINT IF EXISTS itinerary_items_type_check;

-- Add the new constraint with all valid types (including old ones for backward compatibility)
ALTER TABLE public.itinerary_items 
ADD CONSTRAINT itinerary_items_type_check 
CHECK (type IN ('flight', 'stay', 'activity', 'food', 'note', 'transport', 'accommodation', 'meal', 'landmark', 'event', 'local_transport', 'shopping', 'outdoor', 'museum', 'wellness', 'social', 'free_time', 'checkin'));