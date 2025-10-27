import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/layout/navigation";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TripCard from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

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

  // Check for database errors
  if (tripsError) {
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
                  <li>Copy and paste the contents of <code className="bg-background px-1 rounded">&quot;supabase/schema.sql&quot;</code></li>
                                      <li>Click &quot;Run&quot; to execute the SQL</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <p className="text-sm text-muted-foreground">
                Error: {tripsError?.message}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <main className="container mx-auto py-12 px-4 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              My Trips
            </h1>
            <p className="text-muted-foreground">
              All your adventures in one place
            </p>
          </div>
          <Link href="/trips/new">
            <Button className="modern-btn px-6 py-2.5">
              <Plus className="h-5 w-5 mr-2" />
              New Trip
            </Button>
          </Link>
        </div>

        {/* Trips Grid */}
        {trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          // Empty State
          <Card className="modern-card p-16 text-center max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  No trips yet
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Start planning your next adventure by creating your first trip.
                </p>
              </div>
              <Link href="/trips/new">
                <Button className="modern-btn px-6 py-2.5">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Trip
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
