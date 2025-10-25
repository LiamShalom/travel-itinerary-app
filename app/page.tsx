import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/calendar/calendar-view";
import Navigation from "@/components/layout/navigation";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's trips
  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true });

  // Fetch all itinerary items for calendar display
  const { data: itineraryItems, error: itemsError } = await supabase
    .from("itinerary_items")
    .select("*")
    .order("start_time", { ascending: true });

  // Check for database errors
  if (tripsError || itemsError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <main className="container mx-auto py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Database Setup Required</CardTitle>
              <CardDescription>
                Please set up your database to continue using TravelTrack
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Setup Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to your Supabase project</li>
                  <li>Open the SQL Editor</li>
                  <li>Copy and paste the contents of <code className="bg-background px-1 rounded">supabase/schema.sql</code></li>
                  <li>Click "Run" to execute the SQL</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <p className="text-sm text-muted-foreground">
                Error: {tripsError?.message || itemsError?.message}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />
      <main className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Travel Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your trips and itinerary
          </p>
        </div>
        <CalendarView trips={trips || []} itineraryItems={itineraryItems || []} />
      </main>
    </div>
  );
}
