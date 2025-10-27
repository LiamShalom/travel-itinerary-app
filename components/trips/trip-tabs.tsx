"use client";

import { useState } from "react";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import CalendarView from "@/components/calendar/calendar-view";
import SubtripModal from "@/components/modals/subtrip-modal";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TripTabsProps {
  trip: Trip;
  itineraryItems: ItineraryItem[];
  subtrips: Subtrip[];
}

type TabType = "itinerary" | "locations" | "budget" | "saved";

export default function TripTabs({ trip, itineraryItems, subtrips }: TripTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("itinerary");
  const [showSubtripModal, setShowSubtripModal] = useState(false);
  const [editingSubtrip, setEditingSubtrip] = useState<Subtrip | undefined>();
  const router = useRouter();

  const tabs = [
    { id: "itinerary" as TabType, label: "Itinerary" },
    { id: "locations" as TabType, label: "Locations" },
    { id: "budget" as TabType, label: "Budget" },
    { id: "saved" as TabType, label: "Saved" },
  ];

  const handleAddLocation = () => {
    setEditingSubtrip(undefined);
    setShowSubtripModal(true);
  };

  const handleEditSubtrip = (subtrip: Subtrip) => {
    setEditingSubtrip(subtrip);
    setShowSubtripModal(true);
  };

  const handleDeleteSubtrip = async (subtripId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("subtrips")
      .delete()
      .eq("id", subtripId);

    if (!error) {
      router.refresh();
    } else {
      console.error("Error deleting subtrip:", error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "itinerary" && (
          <CalendarView trips={[trip]} itineraryItems={itineraryItems} subtrips={subtrips} />
        )}
        {activeTab === "locations" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Trip Locations</h3>
              <Button onClick={handleAddLocation} className="modern-btn px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>

            {subtrips.length > 0 ? (
              <div className="space-y-3">
                {subtrips.map((subtrip) => (
                  <div key={subtrip.id} className="modern-card p-4 group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{subtrip.location}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(subtrip.start_date).toLocaleDateString()} - {new Date(subtrip.end_date).toLocaleDateString()}
                          </p>
                          {subtrip.description && (
                            <p className="text-sm text-muted-foreground mt-1">{subtrip.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubtrip(subtrip)}
                          className="hover:bg-gray-100 h-8 w-8 p-0"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubtrip(subtrip.id)}
                          className="hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="modern-card p-8 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No locations added yet</p>
                <Button onClick={handleAddLocation} className="modern-btn px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Location
                </Button>
              </div>
            )}
          </div>
        )}
        {activeTab === "budget" && (
          <div className="modern-card p-8 text-center">
            <p className="text-muted-foreground">Budget tracking coming soon</p>
          </div>
        )}
        {activeTab === "saved" && (
          <div className="modern-card p-8 text-center">
            <p className="text-muted-foreground">Saved items coming soon</p>
          </div>
        )}
      </div>

      {showSubtripModal && (
        <SubtripModal
          open={showSubtripModal}
          onClose={() => {
            setShowSubtripModal(false);
            setEditingSubtrip(undefined);
          }}
          trip={trip}
          subtrip={editingSubtrip}
        />
      )}
    </div>
  );
}
