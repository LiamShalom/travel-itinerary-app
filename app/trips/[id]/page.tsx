import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navigation from "@/components/layout/navigation";
import { TripProvider } from "@/contexts/trip-context";
import TripDetailContent from "./trip-detail-content";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the specific trip
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    notFound();
  }

  // Fetch subtrips for this trip
  const { data: subtrips } = await supabase
    .from("subtrips")
    .select("*")
    .eq("trip_id", id)
    .order("start_date", { ascending: true });

  // Fetch itinerary items for this trip
  const { data: itineraryItems } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", id)
    .order("start_time", { ascending: true });

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const isUpcoming = startDate > new Date();
  const isOngoing = startDate <= new Date() && endDate >= new Date();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation user={user} />
      <main className="flex-1 flex flex-col">
        <TripProvider initialSubtrips={subtrips || []}>
          <TripDetailContent trip={trip} itineraryItems={itineraryItems || []} />
        </TripProvider>
      </main>
    </div>
  );
}
