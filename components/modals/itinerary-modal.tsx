"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Trip, Subtrip, ItineraryItemType, ItineraryItem } from "@/lib/types/database";
import { Plane, Bed, MapPin, Coffee, StickyNote, DollarSign } from "lucide-react";

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
  flight: { icon: Plane, label: "Flight", color: "text-blue-600" },
  stay: { icon: Bed, label: "Accommodation", color: "text-green-600" },
  activity: { icon: MapPin, label: "Activity", color: "text-purple-600" },
  food: { icon: Coffee, label: "Food & Dining", color: "text-orange-600" },
  note: { icon: StickyNote, label: "Note", color: "text-gray-600" },
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <TypeIcon className={`w-5 h-5 ${selectedTypeConfig.color}`} />
            <div>
              <h2 className="text-lg font-semibold">
                {editingItem ? `Edit ${selectedTypeConfig.label}` : `Add ${selectedTypeConfig.label}`}
              </h2>
              <p className="text-sm text-gray-500">
                {editingItem ? "Update your travel itinerary" : "Plan your travel itinerary"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Type</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(typeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type as any }))}
                      className={`
                        relative p-3 rounded-lg border transition-all duration-200
                        flex flex-col items-center gap-2 text-xs font-medium min-h-[70px]
                        ${formData.type === type 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 ${formData.type === type ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="text-center leading-tight">{config.label}</span>
                      {formData.type === type && (
                        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip</label>
              <select
                value={formData.trip_id}
                onChange={(e) => setFormData(prev => ({ ...prev, trip_id: e.target.value, subtrip_id: "" }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            {subtrips.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtrip (Optional)</label>
                <select
                  value={formData.subtrip_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtrip_id: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder={`Enter ${selectedTypeConfig.label.toLowerCase()} title`}
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter location"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            {/* Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                placeholder="Add any additional notes..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="flex-1"
            disabled={loading}
          >
            {loading ? (editingItem ? "Updating..." : "Adding...") : (editingItem ? "Update Item" : "Add Item")}
          </Button>
        </div>
      </div>
    </div>
  );
}
