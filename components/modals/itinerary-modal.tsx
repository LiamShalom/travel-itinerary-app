"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Trip } from "@/lib/types/database";

interface ItineraryModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  trips: Trip[];
}

export default function ItineraryModal({ open, onClose, defaultDate, trips }: ItineraryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_id: trips[0]?.id || "",
    type: "activity" as const,
    title: "",
    location: "",
    start_time: defaultDate.toISOString().slice(0, 16),
    end_time: "",
    notes: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    if (!formData.trip_id) {
      alert("Please select a trip");
      setLoading(false);
      return;
    }
    
    const { error } = await supabase
      .from("itinerary_items")
      .insert([formData]);

    if (!error) {
      router.refresh();
      onClose();
    } else {
      console.error("Error saving itinerary item:", error);
      alert(`Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  if (!open) return null;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-md modern-card my-8">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Add to Itinerary
          </CardTitle>
          <CardDescription className="text-base">
            Plan your activities, flights, stays, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Trip</label>
              <select
                required
                value={formData.trip_id}
                onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title} - {trip.destination}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="modern-input w-full px-4 py-2.5"
              >
                <option value="activity">Activity</option>
                <option value="flight">Flight</option>
                <option value="stay">Stay</option>
                <option value="food">Food</option>
                <option value="note">Note</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                placeholder="e.g., Museum Visit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location (optional)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                placeholder="e.g., Louvre Museum"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Time (optional)</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                rows={3}
                placeholder="Add any additional details..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="modern-btn px-4 py-2">
                {loading ? "Saving..." : "Add to Itinerary"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
