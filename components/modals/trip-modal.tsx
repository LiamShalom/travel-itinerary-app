"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    emoji: trip?.emoji || "✈️",
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{trip ? "Edit Trip" : "Create New Trip"}</CardTitle>
          <CardDescription>
            Add a new trip to your travel calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                maxLength={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Japan 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Tokyo, Japan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Add notes about your trip..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : trip ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
