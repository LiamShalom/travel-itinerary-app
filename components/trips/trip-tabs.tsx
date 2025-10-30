"use client";

import { useState, useCallback } from "react";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import CalendarView from "@/components/calendar/calendar-view";
import SubtripModal from "@/components/modals/subtrip-modal";
import ItineraryModal from "@/components/modals/itinerary-modal";
import { Plus, MapPin, Trash2, Edit, Calendar, Clock, DollarSign, Plane, Bed, Coffee, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useTripContext } from "@/contexts/trip-context";
import { useRouter } from "next/navigation";

interface TripTabsProps {
  trip: Trip;
  itineraryItems: ItineraryItem[];
  subtrips: Subtrip[];
}

type TabType = "itinerary" | "timeline" | "locations" | "budget";

// Type icons for itinerary items
const typeIcons = {
  flight: { icon: Plane, color: "text-blue-600" },
  stay: { icon: Bed, color: "text-green-600" },
  activity: { icon: MapPin, color: "text-purple-600" },
  food: { icon: Coffee, color: "text-orange-600" },
  note: { icon: StickyNote, color: "text-gray-600" },
};

export default function TripTabs({ trip, itineraryItems }: TripTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("itinerary");
  const [showSubtripModal, setShowSubtripModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [editingSubtrip, setEditingSubtrip] = useState<Subtrip | undefined>();
  const [editingItineraryItem, setEditingItineraryItem] = useState<ItineraryItem | undefined>();
  const [defaultModalDate, setDefaultModalDate] = useState<Date>(new Date(trip.start_date));
  const [defaultModalDateString, setDefaultModalDateString] = useState<string>("");
  const [defaultModalSubtrip, setDefaultModalSubtrip] = useState<Subtrip | undefined>();
  const { subtrips, removeSubtrip } = useTripContext();
  const router = useRouter();

  const tabs = [
    { id: "itinerary" as TabType, label: "Itinerary" },
    { id: "timeline" as TabType, label: "Timeline" },
    { id: "locations" as TabType, label: "Locations" },
    { id: "budget" as TabType, label: "Budget" },
  ];

  const handleAddLocation = () => {
    setEditingSubtrip(undefined);
    setShowSubtripModal(true);
  };

  const handleAddItinerary = () => {
    setEditingItineraryItem(undefined);
    setDefaultModalDate(new Date(trip.start_date));
    setDefaultModalSubtrip(undefined);
    setShowItineraryModal(true);
  };

  const handleAddItineraryFromCalendar = (dateString: string, subtrip?: Subtrip) => {
    console.log('Adding itinerary from calendar with dateString:', dateString);
    setEditingItineraryItem(undefined);
    setDefaultModalDateString(dateString);
    setDefaultModalSubtrip(subtrip);
    setShowItineraryModal(true);
  };

  const handleEditItineraryItem = (item: ItineraryItem) => {
    setEditingItineraryItem(item);
    setDefaultModalDate(new Date(item.start_time));
    setDefaultModalSubtrip(undefined);
    setShowItineraryModal(true);
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
      removeSubtrip(subtripId);
    } else {
      console.error("Error deleting subtrip:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteItineraryItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      // Force a page refresh to update the data
      router.refresh();
    } else {
      console.error("Error deleting itinerary item:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = useCallback(() => {
    setShowItineraryModal(false);
    setEditingItineraryItem(undefined);
    setDefaultModalSubtrip(undefined);
    // Small delay to ensure modal closes before refresh
    setTimeout(() => {
      router.refresh();
    }, 100);
  }, [router]);

  // Handle item updates from drag and drop
  const handleUpdateItem = useCallback(async (itemId: string, updates: Partial<ItineraryItem>) => {
    // The calendar component already handles the database update
    // We just need to refresh the page data
    router.refresh();
  }, [router]);

  // Group itinerary items by date
  const groupedItems = itineraryItems.reduce((groups, item) => {
    const date = new Date(item.start_time).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {} as Record<string, ItineraryItem[]>);

  // Calculate total cost
  const totalCost = itineraryItems.reduce((sum, item) => {
    return sum + (item.cost || 0);
  }, 0);

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
          <div className="space-y-6">
            {/* Add to Itinerary Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Itinerary</h3>
              <Button onClick={handleAddItinerary} className="modern-btn px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Add to Itinerary
              </Button>
            </div>

            {/* Calendar View - Always show */}
            <div className="modern-card p-4">
              <CalendarView 
                trips={[trip]} 
                itineraryItems={itineraryItems} 
                subtrips={subtrips}
                onEditItem={handleEditItineraryItem}
                onDeleteItem={handleDeleteItineraryItem}
                onAddItem={handleAddItineraryFromCalendar}
                onUpdateItem={handleUpdateItem}
              />
            </div>
          </div>
        )}
        
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timeline</h3>
            
            {itineraryItems.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(groupedItems).map(([date, items]) => (
                  <div key={date} className="modern-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <h4 className="font-semibold text-gray-900">
                        {new Date(date).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      {items.map((item, index) => {
                        const typeConfig = typeIcons[item.type];
                        const TypeIcon = typeConfig.icon;
                        
                        return (
                          <div key={item.id} className="flex items-center gap-3 text-sm group">
                            <div className={`w-1 h-8 ${index === items.length - 1 ? 'bg-transparent' : 'bg-gray-200'} flex-shrink-0`}></div>
                            <TypeIcon className={`h-4 w-4 ${typeConfig.color} flex-shrink-0`} />
                            <span className="font-medium flex-1">{item.title}</span>
                            {item.location && (
                              <span className="text-gray-500">• {item.location}</span>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditItineraryItem(item)}
                                className="p-1 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit className="h-3 w-3 text-blue-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteItineraryItem(item.id)}
                                className="p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="modern-card p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No timeline items yet</p>
                <p className="text-sm text-gray-500">Add items to your itinerary to see your timeline</p>
              </div>
            )}
          </div>
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
                        <MapPin 
                          className="h-5 w-5 mt-0.5" 
                          style={{ color: subtrip.color || '#6B7280' }}
                        />
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
                          <Edit className="h-3.5 w-3.5" />
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
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Trip Budget</h3>
              {totalCost > 0 && (
                <div className="text-lg font-semibold text-green-600">
                  Total: ${totalCost.toFixed(2)}
                </div>
              )}
            </div>
            
            {itineraryItems.filter(item => item.cost).length > 0 ? (
              <div className="space-y-3">
                {itineraryItems
                  .filter(item => item.cost)
                  .map((item) => {
                    const typeConfig = typeIcons[item.type];
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <div key={item.id} className="modern-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                            <div>
                              <h5 className="font-medium">{item.title}</h5>
                              <p className="text-sm text-gray-500">
                                {new Date(item.start_time).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-lg font-semibold">
                            ${item.cost?.toFixed(2)} {item.currency || 'USD'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="modern-card p-8 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No budget items yet</p>
                <p className="text-sm text-gray-500">Add costs to your itinerary items to track your budget</p>
              </div>
            )}
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
      
      {showItineraryModal && (
        <ItineraryModal
          open={showItineraryModal}
          onClose={handleModalClose}
          defaultDate={new Date()} // Just pass a dummy date since we're using defaultDateString
          defaultDateString={defaultModalDateString}
          trips={[trip]}
          editingItem={editingItineraryItem}
          defaultSubtrip={defaultModalSubtrip}
        />
      )}
    </div>
  );
}
