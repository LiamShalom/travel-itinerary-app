"use client";

import { useState, useCallback } from "react";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import CalendarView from "@/components/calendar/calendar-view";
import ItineraryView from "@/components/itinerary/itinerary-view";
import SubtripModal from "@/components/modals/subtrip-modal";
import ItineraryModal from "@/components/modals/itinerary-modal";
import { Plus, MapPin, Trash2, Edit, Calendar, Clock, DollarSign, Plane, Bed, Coffee, StickyNote, Car, ShoppingBag, Building, Users, Ticket, Train, Utensils, Camera, Calendar as CalendarIcon, TreePine, Heart, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useTripContext } from "@/contexts/trip-context";
import { useRouter } from "next/navigation";
import styles from "@/styles/components/trips/trip-tabs.module.css";

interface TripTabsProps {
  trip: Trip;
  itineraryItems: ItineraryItem[];
  subtrips: Subtrip[];
}

type TabType = "itinerary" | "timeline" | "locations" | "budget";

// Type icons for itinerary items
const typeIcons = {
  flight: { icon: Plane, color: styles.iconBlue },
  stay: { icon: Bed, color: styles.iconGreen },
  activity: { icon: MapPin, color: styles.iconPurple },
  food: { icon: Coffee, color: styles.iconOrange },
  note: { icon: StickyNote, color: styles.iconGray },
  transport: { icon: Train, color: styles.iconIndigo },
  accommodation: { icon: Bed, color: styles.iconGreen },
  meal: { icon: Utensils, color: styles.iconOrange },
  landmark: { icon: Camera, color: styles.iconAmber },
  event: { icon: CalendarIcon, color: styles.iconRed },
  local_transport: { icon: Car, color: styles.iconSlate },
  shopping: { icon: ShoppingBag, color: styles.iconPink },
  outdoor: { icon: TreePine, color: styles.iconEmerald },
  museum: { icon: Building, color: styles.iconYellow },
  wellness: { icon: Heart, color: styles.iconRose },
  social: { icon: Users, color: styles.iconTeal },
  free_time: { icon: Clock, color: styles.iconGray },
  checkin: { icon: CheckCircle, color: styles.iconCyan },
};

export default function TripTabs({ trip, itineraryItems }: TripTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("itinerary");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSubtripModal, setShowSubtripModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [editingSubtrip, setEditingSubtrip] = useState<Subtrip | undefined>();
  const [editingItineraryItem, setEditingItineraryItem] = useState<ItineraryItem | undefined>();
  const [defaultModalDate, setDefaultModalDate] = useState<Date>(new Date(trip.start_date));
  const [defaultModalDateString, setDefaultModalDateString] = useState<string>("");
  const [defaultModalSubtrip, setDefaultModalSubtrip] = useState<Subtrip | undefined>();
  const [expandedBudgetGroups, setExpandedBudgetGroups] = useState<Set<string>>(new Set());
  const { subtrips, removeSubtrip } = useTripContext();
  const router = useRouter();

  const tabs = [
    { id: "itinerary" as TabType, label: "Calendar" },
    { id: "timeline" as TabType, label: "Itinerary" },
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

  const handleDayClickFromCalendar = (date: Date) => {
    // Switch to itinerary tab and scroll to the selected date
    setSelectedDate(date);
    setActiveTab("timeline");
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

  // Group budget items by type
  const budgetItemsByType = itineraryItems
    .filter(item => item.cost)
    .reduce((groups, item) => {
      const type = item.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
      return groups;
    }, {} as Record<string, ItineraryItem[]>);

  // Calculate totals by type
  const typeTotals = Object.entries(budgetItemsByType).map(([type, items]) => ({
    type,
    items,
    total: items.reduce((sum, item) => sum + (item.cost || 0), 0),
    count: items.length
  })).sort((a, b) => b.total - a.total);

  const toggleBudgetGroup = (type: string) => {
    const newExpanded = new Set(expandedBudgetGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedBudgetGroups(newExpanded);
  };

  return (
    <div className={styles.container}>
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tabButton} ${
              activeTab === tab.id ? styles.active : ""
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className={styles.tabIndicator} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === "itinerary" && (
          <div className={styles.calendarContent}>
            <div className={styles.calendarHeader}>
              <h3 className={styles.calendarTitle}>Calendar View</h3>
            </div>
            <CalendarView 
              trips={[trip]} 
              itineraryItems={itineraryItems} 
              subtrips={subtrips}
              onEditItem={handleEditItineraryItem}
              onDeleteItem={handleDeleteItineraryItem}
              onAddItem={handleAddItineraryFromCalendar}
              onUpdateItem={handleUpdateItem}
              onDayClick={handleDayClickFromCalendar}
            />
          </div>
        )}
        
        {activeTab === "timeline" && (
          <div className={styles.timelineContent}>
            <div className={styles.timelineHeader}>
              <h3 className={styles.timelineTitle}>Trip Itinerary</h3>
              <Button onClick={handleAddItinerary} className="modern-btn px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
            <ItineraryView
              trips={[trip]}
              itineraryItems={itineraryItems}
              subtrips={subtrips}
              onEditItem={handleEditItineraryItem}
              onDeleteItem={handleDeleteItineraryItem}
              onAddItem={handleAddItineraryFromCalendar}
              onUpdateItem={handleUpdateItem}
              selectedDate={selectedDate}
            />
          </div>
        )}
        
        {activeTab === "locations" && (
          <div className={styles.locationsContent}>
            <div className={styles.locationsHeader}>
              <h3 className={styles.locationsTitle}>Trip Locations</h3>
              <Button onClick={handleAddLocation} className="modern-btn px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>

            {subtrips.length > 0 ? (
              <div className={styles.locationsList}>
                {subtrips.map((subtrip) => (
                  <div key={subtrip.id} className={`${styles.modernCard} ${styles.locationCard}`}>
                    <div className={styles.locationContent}>
                      <div className={styles.locationInfo}>
                        <MapPin 
                          className={styles.locationIcon}
                          style={{ color: subtrip.color || '#6B7280' }}
                        />
                        <div className={styles.locationDetails}>
                          <h4 className={styles.locationName}>{subtrip.location}</h4>
                          <p className={styles.locationDates}>
                            {new Date(subtrip.start_date).toLocaleDateString()} - {new Date(subtrip.end_date).toLocaleDateString()}
                          </p>
                          {subtrip.description && (
                            <p className={styles.locationDescription}>{subtrip.description}</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.locationActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubtrip(subtrip)}
                          className={`${styles.locationActionButton} ${styles.edit}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubtrip(subtrip.id)}
                          className={`${styles.locationActionButton} ${styles.delete}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${styles.modernCard} ${styles.emptyState}`}>
                <MapPin className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No locations added yet</p>
                <Button onClick={handleAddLocation} className="modern-btn px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Location
                </Button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "budget" && (
          <div className={styles.budgetContent}>
            <div className={styles.budgetHeader}>
              <h3 className={styles.budgetTitle}>Trip Budget</h3>
              {totalCost > 0 && (
                <div className={styles.budgetTotal}>
                  Total: ${totalCost.toFixed(2)}
                </div>
              )}
            </div>
            
            {typeTotals.length > 0 ? (
              <div className={styles.budgetGroups}>
                {typeTotals.map(({ type, items, total, count }) => {
                  const typeConfig = typeIcons[type as keyof typeof typeIcons] || typeIcons.activity;
                  const TypeIcon = typeConfig.icon;
                  const isExpanded = expandedBudgetGroups.has(type);
                  
                  return (
                    <div key={type} className={`${styles.modernCard} ${styles.budgetGroup}`}>
                      <button
                        onClick={() => toggleBudgetGroup(type)}
                        className={styles.budgetGroupHeader}
                      >
                        <div className={styles.budgetGroupInfo}>
                          <TypeIcon className={`${styles.budgetIcon} ${typeConfig.color}`} />
                          <div className={styles.budgetGroupDetails}>
                            <h5 className={styles.budgetGroupName}>{type.replace('_', ' ')}</h5>
                            <p className={styles.budgetGroupCount}>
                              {count} item{count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className={styles.budgetGroupTotal}>
                          <div className={styles.budgetAmount}>
                            ${total.toFixed(2)}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className={styles.budgetGroupItems}>
                          {items.map((item) => (
                            <div key={item.id} className={styles.budgetItem}>
                              <div>
                                <h6 className={styles.budgetItemName}>{item.title}</h6>
                                <p className={styles.budgetGroupCount}>
                                  {new Date(item.start_time).toLocaleDateString()}
                                  {item.location && ` • ${item.location}`}
                                </p>
                              </div>
                              <div className={styles.budgetItemCost}>
                                ${item.cost?.toFixed(2)} {item.currency || 'USD'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${styles.modernCard} ${styles.emptyState}`}>
                <DollarSign className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No budget items yet</p>
                <p className={styles.emptyDescription}>Add costs to your itinerary items to track your budget</p>
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
