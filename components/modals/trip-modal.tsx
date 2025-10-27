"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LocationSelector from "@/components/ui/location-selector";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TripModalProps {
  open: boolean;
  onClose: () => void;
  trip?: any;
}

export default function TripModal({ open, onClose, trip }: TripModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: trip?.title || "",
    destination: trip?.destination || "",
    start_date: trip?.start_date || "",
    end_date: trip?.end_date || "",
    description: trip?.description || "",
    emoji: trip?.emoji || "",
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
    
    const { error } = trip
      ? await supabase
          .from("trips")
          .update(formData)
          .eq("id", trip.id)
      : await supabase
          .from("trips")
          .insert([tripData]);

    if (!error) {
      router.refresh();
      onClose();
    } else {
      console.error("Error saving trip:", error);
      alert(`Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md modern-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {trip ? "Edit Trip" : "Create New Trip"}
          </CardTitle>
          <CardDescription className="text-base">
            {trip ? "Update your travel details" : "Add a new trip to your collection"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Trip Emoji (optional)</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="modern-input w-full px-4 py-2.5 text-2xl text-center"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trip Title</label>
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
              <label className="block text-sm font-medium mb-2">Destination</label>
              <LocationSelector
                value={formData.destination}
                onChange={(destination) => setFormData({ ...formData, destination })}
                placeholder="Search for any destination worldwide..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="modern-input w-full px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
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
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                rows={3}
                placeholder="Add notes about your trip..."
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
                {loading ? "Saving..." : trip ? "Update Trip" : "Create Trip"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
