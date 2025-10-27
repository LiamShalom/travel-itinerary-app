"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTripPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    start_date: "",
    end_date: "",
    description: "",
    emoji: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      setLoading(false);
      return;
    }

    const tripData = {
      ...formData,
      user_id: user.id,
    };

    const { error } = await supabase
      .from("trips")
      .insert([tripData]);

    if (!error) {
      router.push("/");
      router.refresh();
    } else {
      console.error("Error saving trip:", error);
      alert(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Trips
          </Button>
        </Link>

        <Card className="modern-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Create New Trip
            </CardTitle>
            <CardDescription className="text-base">
              Add a new trip to your collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Trip Emoji (optional)
                </label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="modern-input w-full px-4 py-2.5 text-2xl text-center"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Choose an emoji to represent your trip
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Trip Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="modern-input w-full px-4 py-2.5"
                  placeholder="Summer in Europe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="modern-input w-full px-4 py-2.5"
                  placeholder="Paris, France"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="modern-input w-full px-4 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="modern-input w-full px-4 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="modern-input w-full px-4 py-2.5"
                  rows={4}
                  placeholder="Add notes about your trip..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Link href="/">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-6 py-2.5"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading} className="modern-btn px-6 py-2.5">
                  {loading ? "Creating..." : "Create Trip"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
