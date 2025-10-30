"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LocationSelector from "@/components/ui/location-selector";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import styles from "@/styles/components/modals/trip-modal.module.css";

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
    <div className={styles.overlay}>
      <Card className={styles.modal}>
        <CardHeader className={styles.header}>
          <CardTitle className={styles.title}>
            {trip ? "Edit Trip" : "Create New Trip"}
          </CardTitle>
          <CardDescription className={styles.description}>
            {trip ? "Update your travel details" : "Add a new trip to your collection"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Trip Emoji (optional)</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className={styles.emojiInput}
                maxLength={2}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Trip Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={styles.input}
                placeholder="Summer in Europe"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Destination</label>
              <LocationSelector
                value={formData.destination}
                onChange={(destination) => setFormData({ ...formData, destination })}
                placeholder="Search for any destination worldwide..."
              />
            </div>

            <div className={styles.dateGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>End Date</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={styles.textarea}
                rows={3}
                placeholder="Add notes about your trip..."
              />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className={styles.submitButton}
              >
                {loading ? "Saving..." : trip ? "Update Trip" : "Create Trip"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
