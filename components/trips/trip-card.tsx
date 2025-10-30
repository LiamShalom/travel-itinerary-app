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
import styles from "@/styles/components/trips/trip-card.module.css";

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
      <Card className={styles.card} onClick={() => router.push(`/trips/${trip.id}`)}>
        <CardHeader className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleSection}>
              {trip.emoji && (
                <span className={styles.emoji}>{trip.emoji}</span>
              )}
              <div className={styles.titleContent}>
                <CardTitle className={styles.title}>
                  {trip.title}
                </CardTitle>
                <CardDescription className={styles.destination}>
                  <MapPin className={styles.destinationIcon} />
                  <span className={styles.destinationText}>{trip.destination}</span>
                </CardDescription>
              </div>
            </div>
            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className={`${styles.actionButton} ${styles.editButton}`}
              >
                <Edit className={styles.actionIcon} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className={`${styles.actionButton} ${styles.deleteButton}`}
              >
                <Trash2 className={styles.deleteIcon} />
              </Button>
            </div>
          </div>

          <div className={styles.statusContainer}>
            {isOngoing && (
              <div className={`${styles.statusBadge} ${styles.statusOngoing}`}>
                Happening Now
              </div>
            )}
            {isUpcoming && !isOngoing && (
              <div className={`${styles.statusBadge} ${styles.statusUpcoming}`}>
                Upcoming
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={styles.content}>
          <div className={styles.dateInfo}>
            <Calendar className={styles.dateIcon} />
            <span>
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </span>
          </div>

          {trip.description && (
            <p className={styles.description}>
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
