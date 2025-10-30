export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ItineraryItemType = "flight" | "transport" | "accommodation" | "meal" | "activity" | "landmark" | "event" | "local_transport" | "shopping" | "outdoor" | "museum" | "wellness" | "social" | "free_time" | "checkin";

export interface User {
  id: string;
  email: string;
  timezone?: string;
  currency?: string;
  home_location?: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  color?: string;
  emoji?: string;
  created_at: string;
  updated_at: string;
}

export interface Subtrip {
  id: string;
  trip_id: string;
  location: string;
  start_date: string;
  end_date: string;
  description?: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  subtrip_id?: string;
  type: ItineraryItemType;
  title: string;
  location?: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}
