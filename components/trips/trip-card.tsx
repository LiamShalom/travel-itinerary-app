"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trip } from "@/lib/types/database";
import { Calendar, MapPin, Edit, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import TripModal from "@/components/modals/trip-modal";

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${trip.title}"? This will also delete all itinerary items.`)) {
      return;
    }

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", trip.id);

    if (!error) {
      router.refresh();
    } else {
      console.error("Error deleting trip:", error);
      alert(`Error: ${error.message}`);
      setDeleting(false);
    }
  };

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const isUpcoming = startDate > new Date();
  const isOngoing = startDate <= new Date() && endDate >= new Date();

  return (
    <>
      <Card className="modern-card hover:shadow-lg transition-shadow group cursor-pointer" onClick={() => router.push(`/trips/${trip.id}`)}>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-bold tracking-tight line-clamp-1">
                  {trip.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-sm mt-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{trip.destination}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="hover:bg-gray-100 h-8 w-8 p-0"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </span>
          </div>

          {trip.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {trip.description}
            </p>
          )}
        </CardContent>
      </Card>

      {showEditModal && (
        <TripModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          trip={trip}
        />
      )}
    </>
  );
}
