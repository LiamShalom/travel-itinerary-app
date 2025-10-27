import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navigation from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import MapView from "@/components/map/map-view";
import TripTabs from "@/components/trips/trip-tabs";

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
        <div className="container mx-auto py-4 px-4 max-w-7xl">
          <Link href="/">
            <Button variant="ghost" className="hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Trips
            </Button>
          </Link>
        </div>

        {/* Trip Header */}
        <div className="container mx-auto px-4 max-w-7xl mb-4">
          <div className="modern-card p-6">
            <div className="flex items-start gap-4">
              <div className="space-y-2 flex-1">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {trip.title}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {trip.destination}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </span>
                  </div>

                  {isOngoing && (
                    <div className="inline-flex items-center gap-1.5 bg-black text-white px-2.5 py-1 rounded-md text-xs font-medium">
                      Happening Now
                    </div>
                  )}
                  {isUpcoming && !isOngoing && (
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 text-black px-2.5 py-1 rounded-md text-xs font-medium">
                      Upcoming
                    </div>
                  )}
                </div>

                {trip.description && (
                  <p className="text-sm text-muted-foreground">
                    {trip.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Split View: Tabs (Left) and Map (Right) */}
        <div className="flex-1 container mx-auto px-4 max-w-7xl pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left: Tabs */}
            <div className="modern-card p-6 overflow-hidden flex flex-col min-h-[600px]">
              <TripTabs trip={trip} itineraryItems={itineraryItems || []} subtrips={subtrips || []} />
            </div>

            {/* Right: Map */}
            <div className="modern-card p-6 min-h-[600px]">
              <MapView destination={trip.destination} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
