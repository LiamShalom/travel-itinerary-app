"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Subtrip, Trip } from "@/lib/types/database";

interface SubtripModalProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  subtrip?: Subtrip;
}

const availableColors = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Green", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Orange", value: "#F97316" },
];

export default function SubtripModal({ open, onClose, trip, subtrip }: SubtripModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: subtrip?.location || "",
    start_date: subtrip?.start_date || trip.start_date,
    end_date: subtrip?.end_date || trip.end_date,
    description: subtrip?.description || "",
    color: subtrip?.color || availableColors[0].value,
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const subtripData = {
      ...formData,
      trip_id: trip.id,
      order_index: subtrip?.order_index || 0,
    };

    const { error } = subtrip
      ? await supabase
          .from("subtrips")
          .update(formData)
          .eq("id", subtrip.id)
      : await supabase
          .from("subtrips")
          .insert([subtripData]);

    if (!error) {
      router.refresh();
      onClose();
    } else {
      console.error("Error saving subtrip:", error);
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
            {subtrip ? "Edit Location" : "Add Location"}
          </CardTitle>
          <CardDescription className="text-base">
            Add a specific location within {trip.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                placeholder="e.g., Tokyo"
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
                  min={trip.start_date}
                  max={trip.end_date}
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
                  min={formData.start_date}
                  max={trip.end_date}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {availableColors.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.value })}
                    className={`h-12 rounded-md border-2 transition-all ${
                      formData.color === colorOption.value
                        ? "border-black scale-110"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="modern-input w-full px-4 py-2.5"
                rows={3}
                placeholder="Add notes about this location..."
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
                {loading ? "Saving..." : subtrip ? "Update Location" : "Add Location"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
