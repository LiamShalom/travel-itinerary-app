"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Trip, Subtrip, ItineraryItemType, ItineraryItem } from "@/lib/types/database";
import { Plane, Bed, MapPin, Coffee, StickyNote, DollarSign, Car, ShoppingBag, Building, Users, Ticket, Train, Utensils, Camera, Calendar, TreePine, Palette, Heart, Clock, CheckCircle } from "lucide-react";
import styles from "@/styles/components/modals/itinerary-modal.module.css";

interface ItineraryModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  defaultDateString?: string;
  trips: Trip[];
  editingItem?: ItineraryItem;
  defaultSubtrip?: Subtrip;
}

// Type icons and labels
const typeConfig = {
  flight: { icon: Plane, label: "Flight", color: styles.iconBlue },
  transport: { icon: Train, label: "Transport", color: styles.iconIndigo },
  accommodation: { icon: Bed, label: "Stay", color: styles.iconGreen },
  meal: { icon: Utensils, label: "Dining", color: styles.iconOrange },
  activity: { icon: MapPin, label: "Activity", color: styles.iconPurple },
  landmark: { icon: Camera, label: "Landmark", color: styles.iconAmber },
  event: { icon: Calendar, label: "Event", color: styles.iconRed },
  local_transport: { icon: Car, label: "Local", color: styles.iconSlate },
  shopping: { icon: ShoppingBag, label: "Shopping", color: styles.iconPink },
  outdoor: { icon: TreePine, label: "Outdoor", color: styles.iconEmerald },
  museum: { icon: Building, label: "Museum", color: styles.iconYellow },
  wellness: { icon: Heart, label: "Wellness", color: styles.iconRose },
  social: { icon: Users, label: "Social", color: styles.iconTeal },
  free_time: { icon: Clock, label: "Free", color: styles.iconGray },
  checkin: { icon: CheckCircle, label: "Check-in", color: styles.iconCyan },
};

const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY"];

export default function ItineraryModal({ open, onClose, defaultDate, defaultDateString, trips, editingItem, defaultSubtrip }: ItineraryModalProps) {
  const [loading, setLoading] = useState(false);
  const [subtrips, setSubtrips] = useState<Subtrip[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState({
    trip_id: trips[0]?.id || "",
    subtrip_id: "",
    type: "activity" as ItineraryItemType,
    title: "",
    location: "",
    start_time: "",
    end_time: "",
    notes: "",
    cost: "",
    currency: "USD",
  });
  const router = useRouter();

  // Initialize form data when modal opens
  useEffect(() => {
    if (open && !initialized) {
      console.log('Modal initializing with:', { editingItem, defaultDate, defaultSubtrip });
      
      if (editingItem) {
        // Editing existing item
        setFormData({
          trip_id: editingItem.trip_id,
          subtrip_id: editingItem.subtrip_id || "",
          type: editingItem.type,
          title: editingItem.title,
          location: editingItem.location || "",
          start_time: new Date(editingItem.start_time).toISOString().split('T')[0],
          end_time: "",
          notes: editingItem.notes || "",
          cost: editingItem.cost?.toString() || "",
          currency: editingItem.currency || "USD",
        });
      } else {
        // Creating new item - use the date string if provided, otherwise fall back to defaultDate
        let dateToUse;
        if (defaultDateString) {
          dateToUse = defaultDateString;
          console.log('✅ Using defaultDateString:', defaultDateString);
        } else {
          console.log('❌ No defaultDateString, falling back to defaultDate:', defaultDate);
          const now = new Date();
          dateToUse = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          console.log('❌ Using current date:', dateToUse);
        }
        
        console.log('🎯 FINAL DATE BEING SET IN FORM:', dateToUse);
        
        setFormData({
          trip_id: trips[0]?.id || "",
          subtrip_id: defaultSubtrip?.id || "",
          type: "activity",
          title: "",
          location: defaultSubtrip?.location || "",
          start_time: dateToUse,
          end_time: "",
          notes: "",
          cost: "",
          currency: "USD",
        });
      }
      setInitialized(true);
    }
    
    // Reset when modal closes
    if (!open && initialized) {
      setInitialized(false);
    }
  }, [open, editingItem, defaultDate, defaultDateString, defaultSubtrip, trips, initialized]);

  // Load subtrips when trip changes
  useEffect(() => {
    const loadSubtrips = async () => {
      if (!formData.trip_id) return;
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subtrips")
        .select("*")
        .eq("trip_id", formData.trip_id)
        .order("start_date");
        
      if (!error && data) {
        setSubtrips(data);
      }
    };
    
    loadSubtrips();
  }, [formData.trip_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    if (!formData.trip_id) {
      alert("Please select a trip");
      setLoading(false);
      return;
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      start_time: new Date(formData.start_time + 'T12:00:00').toISOString(), // Set to noon
      end_time: null, // Remove end_time since we're only using dates
      cost: formData.cost ? parseFloat(formData.cost) : null,
      subtrip_id: formData.subtrip_id || null,
    };
    
    let error;
    
    if (editingItem) {
      // Update existing item
      const { error: updateError } = await supabase
        .from("itinerary_items")
        .update(submitData)
        .eq("id", editingItem.id);
      error = updateError;
    } else {
      // Create new item
      const { error: insertError } = await supabase
        .from("itinerary_items")
        .insert([submitData]);
      error = insertError;
    }

    if (!error) {
      // Close modal first
      onClose();
      
      // Reset form only if creating new item
      if (!editingItem) {
        setFormData({
          trip_id: trips[0]?.id || "",
          subtrip_id: "",
          type: "activity",
          title: "",
          location: "",
          start_time: defaultDate.toISOString().split('T')[0],
          end_time: "",
          notes: "",
          cost: "",
          currency: "USD",
        });
      }
      
      // Refresh the page to show updated data
      router.refresh();
    } else {
      console.error("Error saving itinerary item:", error);
      alert(`Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  if (!open) return null;

  const selectedTypeConfig = typeConfig[formData.type];
  const TypeIcon = selectedTypeConfig.icon;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <TypeIcon className={`w-5 h-5 ${selectedTypeConfig.color}`} />
            <div>
              <h2 className={styles.title}>
                {editingItem ? `Edit ${selectedTypeConfig.label}` : `Add ${selectedTypeConfig.label}`}
              </h2>
              <p className={styles.description}>
                {editingItem ? "Update your travel itinerary" : "Plan your travel itinerary"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Item Type Selection */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Item Type</label>
              <div className={styles.typeGrid}>
                {Object.entries(typeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type as any }))}
                      className={`${styles.typeButton} ${
                        formData.type === type ? styles.typeButtonSelected : ""
                      }`}
                    >
                      <Icon className={`${styles.typeIcon} ${config.color}`} />
                      <span className={styles.typeLabel}>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip Selection */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Trip</label>
              <select
                value={formData.trip_id}
                onChange={(e) => setFormData(prev => ({ ...prev, trip_id: e.target.value, subtrip_id: "" }))}
                className={styles.select}
                required
              >
                <option value="">Select a trip</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtrip Selection */}
            {formData.trip_id && subtrips.length > 0 && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Subtrip (Optional)</label>
                <select
                  value={formData.subtrip_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtrip_id: e.target.value }))}
                  className={styles.select}
                >
                  <option value="">Select a subtrip</option>
                  {subtrips.map((subtrip) => (
                    <option key={subtrip.id} value={subtrip.id}>
                      {subtrip.location}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={styles.input}
                placeholder={`Enter ${selectedTypeConfig.label.toLowerCase()} title`}
                required
              />
            </div>

            {/* Location */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className={styles.input}
                placeholder="Enter location"
              />
            </div>

            {/* Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Date</label>
              <input
                type="date"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className={styles.input}
                required
              />
            </div>

            {/* Cost */}
            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className={styles.select}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className={styles.textarea}
                rows={2}
                placeholder="Add any additional notes..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (editingItem ? "Updating..." : "Adding...") : (editingItem ? "Update Item" : "Add Item")}
          </button>
        </div>
      </div>
    </div>
  );
}
