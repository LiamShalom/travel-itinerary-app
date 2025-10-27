"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LocationSelector from "@/components/ui/location-selector";
import { createClient } from "@/lib/supabase/client";
import { Subtrip, Trip } from "@/lib/types/database";
import { useTripContext } from "@/contexts/trip-context";

interface SubtripModalProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  subtrip?: Subtrip;
}

const availableColors = [
  { name: "Red", value: "#E31A1C" },
  { name: "Orange", value: "#FF7F00" },
  { name: "Green", value: "#33A02C" },
  { name: "Blue", value: "#1F78B4" },
  { name: "Purple", value: "#6A3D9A" },
  { name: "Brown", value: "#B15928" },
  { name: "Light_Red", value: "#FB9a99" },
  { name: "Light_Orange", value: "#FDBF6F" },
  { name: "Light_Green", value: "#B2DF84" },
  { name: "Light_Blue", value: "#A6CEE3" },
  { name: "Light_Purple", value: "#CAB2D6" },
  { name: "Yellow", value: "#FFFF99" },

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
  const { addSubtrip, updateSubtrip } = useTripContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const subtripData = {
      ...formData,
      trip_id: trip.id,
      order_index: subtrip?.order_index || 0,
    };

    const { error, data } = subtrip
      ? await supabase
        .from("subtrips")
        .update(formData)
        .eq("id", subtrip.id)
        .select()
        .single()
      : await supabase
        .from("subtrips")
        .insert([subtripData])
        .select()
        .single();

    if (!error && data) {
      // Update the context instead of router.refresh()
      if (subtrip) {
        updateSubtrip(subtrip.id, data);
      } else {
        addSubtrip(data);
      }
      onClose();
    } else {
      console.error("Error saving subtrip:", error);
      alert(`Error: ${error?.message || 'Unknown error occurred'}`);
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
              <LocationSelector
                value={formData.location}
                onChange={(location) => setFormData({ ...formData, location })}
                placeholder="Search for a specific location..."
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
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
                {availableColors.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.value })}
                    className={`h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${formData.color === colorOption.value
                      ? "border-black scale-110 shadow-lg"
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
