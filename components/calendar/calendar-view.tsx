"use client";

import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TripModal from "@/components/modals/trip-modal";

interface CalendarViewProps {
  trips: Trip[];
  itineraryItems: ItineraryItem[];
  subtrips?: Subtrip[];
}

export default function CalendarView({ trips, itineraryItems, subtrips = [] }: CalendarViewProps) {
  const localizer = useMemo(() => {
    console.log('Calendar localizer initialized');
    return momentLocalizer(moment);
  }, []);
  const [showTripModal, setShowTripModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const calendarWrapperRef = useRef<HTMLDivElement>(null);

  console.log('CalendarView rendered with', trips.length, 'trips and', itineraryItems.length, 'items');
  console.log('Current view:', currentView, 'Current date:', currentDate);

  useEffect(() => {
    if (calendarWrapperRef.current) {
      const buttons = calendarWrapperRef.current.querySelectorAll('.rbc-toolbar button');
      console.log('Found', buttons.length, 'calendar buttons');

      buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
          console.log('Button clicked:', button.textContent, 'at index', index);
        });
      });

      // Cleanup
      return () => {
        buttons.forEach((button) => {
          button.removeEventListener('click', () => {});
        });
      };
    }
  }, [trips, itineraryItems]);

  const handleNavigate = (newDate: Date) => {
    console.log('Navigate to:', newDate);
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    console.log('View changed to:', newView);
    setCurrentView(newView);
  };

  const navigatePrevious = () => {
    let newDate;
    if (currentView === 'month') {
      newDate = moment(currentDate).subtract(1, 'month').toDate();
    } else if (currentView === 'week') {
      newDate = moment(currentDate).subtract(1, 'week').toDate();
    } else {
      newDate = moment(currentDate).subtract(1, 'day').toDate();
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    let newDate;
    if (currentView === 'month') {
      newDate = moment(currentDate).add(1, 'month').toDate();
    } else if (currentView === 'week') {
      newDate = moment(currentDate).add(1, 'week').toDate();
    } else {
      newDate = moment(currentDate).add(1, 'day').toDate();
    }
    setCurrentDate(newDate);
  };

  const CustomToolbar = () => {
    return (
      <div className="space-y-4 mb-4">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={navigatePrevious}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {moment(currentDate).format('MMMM YYYY')}
          </h3>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setCurrentView('month')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              currentView === 'month'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Month
            {currentView === 'month' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              currentView === 'week'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Week
            {currentView === 'week' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setCurrentView('day')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              currentView === 'day'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Day
            {currentView === 'day' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        </div>
      </div>
    );
  };

  // Only show itinerary items, not trip events (to remove black bars)
  const events = [
    ...itineraryItems.map((item) => ({
      id: item.id,
      title: `${item.type}: ${item.title}`,
      start: new Date(item.start_time),
      end: item.end_time ? new Date(item.end_time) : new Date(item.start_time),
      resource: { type: "item", data: item },
    })),
  ];

  // Create a map of locations to their custom colors
  const locationColorMap = useMemo(() => {
    const map = new Map<string, string>();

    // Map subtrip locations to their custom colors
    subtrips.forEach((subtrip) => {
      if (subtrip.color) {
        map.set(subtrip.location, subtrip.color);
      }
    });

    // Map trip destinations to their colors (if they have one)
    trips.forEach((trip) => {
      if (trip.color) {
        map.set(trip.destination, trip.color);
      }
    });

    return map;
  }, [trips, subtrips]);

  // Generate a consistent color for each destination/location with unique encoding for trips vs subtrips
  const getLocationColor = useCallback((location: string, isTrip: boolean = false, itemId?: string) => {
    // First check if there's a custom color
    if (locationColorMap.has(location)) {
      return locationColorMap.get(location)!;
    }

    // Use expanded color palette for better uniqueness
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // amber
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
      '#6366F1', // indigo
      '#84CC16', // lime
      '#F43F5E', // rose
      '#06B6D4', // cyan
      '#8B5A3C', // brown
      '#6B7280', // gray
      '#DC2626', // red-600
      '#059669', // emerald-600
    ];

    // Create unique hash key that includes location + type + optional id
    const hashKey = itemId ? `${location}-${isTrip ? 'trip' : 'subtrip'}-${itemId}` : `${location}-${isTrip ? 'trip' : 'subtrip'}`;
    
    // Simple hash function to get consistent color for same hashKey
    let hash = 0;
    for (let i = 0; i < hashKey.length; i++) {
      hash = hashKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [locationColorMap]);

  // Create a map of dates to locations (prioritize subtrips over trips)
  const dateLocationMap = useMemo(() => {
    const map = new Map<string, string>();

    console.log('Building date location map...');
    console.log('Trips:', trips);
    console.log('Subtrips:', subtrips);

    // First, map all trip dates to trip destination (fallback)
    trips.forEach((trip) => {
      const start = moment(trip.start_date);
      const end = moment(trip.end_date);
      const current = start.clone();

      console.log(`Trip "${trip.title}": ${trip.start_date} to ${trip.end_date}, destination: ${trip.destination}`);

      while (current.isSameOrBefore(end, 'day')) {
        map.set(current.format('YYYY-MM-DD'), trip.destination);
        current.add(1, 'day');
      }
    });

    // Then override with subtrip locations (more specific)
    subtrips.forEach((subtrip) => {
      const start = moment(subtrip.start_date);
      const end = moment(subtrip.end_date);
      const current = start.clone();

      console.log(`Subtrip "${subtrip.location}": ${subtrip.start_date} to ${subtrip.end_date}`);

      while (current.isSameOrBefore(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD');
        console.log(`  Setting ${dateStr} to ${subtrip.location}`);
        map.set(dateStr, subtrip.location);
        current.add(1, 'day');
      }
    });

    console.log('Final date location map:', Array.from(map.entries()));

    return map;
  }, [trips, subtrips]);

  // Custom day cell wrapper to add background colors
  const dayPropGetter = (date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const location = dateLocationMap.get(dateStr);

    if (location) {
      const color = getLocationColor(location, false); // Always false for calendar days since we prioritize subtrips
      return {
        style: {
          backgroundColor: `${color}15`, // 15 is hex for ~8% opacity
        },
      };
    }

    return {};
  };

  const eventStyleGetter = (event: any) => {
    const isTrip = event.resource.type === "trip";
    const backgroundColor = isTrip ? "#000000" : "#4B5563";
    const borderColor = isTrip ? "#000000" : "#6B7280";

    return {
      style: {
        backgroundColor,
        color: "white",
        borderRadius: "6px",
        border: `1px solid ${borderColor}`,
        fontWeight: "500",
        padding: "4px 8px",
        fontSize: "0.875rem",
      },
    };
  };

  // Get unique locations with their colors for legend
  const locationLegend = useMemo(() => {
    const locationMap = new Map<string, { location: string; color: string; isTrip: boolean; id: string }>();

    // Add trip destinations first
    trips.forEach(trip => {
      const key = `trip-${trip.destination}`;
      locationMap.set(key, {
        location: trip.destination,
        color: getLocationColor(trip.destination, true, trip.id),
        isTrip: true,
        id: trip.id,
      });
    });

    // Add subtrip locations (will not override trips since keys are unique)
    subtrips.forEach(subtrip => {
      const key = `subtrip-${subtrip.location}`;
      locationMap.set(key, {
        location: subtrip.location,
        color: getLocationColor(subtrip.location, false, subtrip.id),
        isTrip: false,
        id: subtrip.id,
      });
    });

    return Array.from(locationMap.values());
  }, [trips, subtrips, getLocationColor]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Itinerary</h2>
      </div>

      <div ref={calendarWrapperRef} className="modern-card p-4 calendar-wrapper">
        <CustomToolbar />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          date={currentDate}
          view={currentView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          popup
          views={["month", "week", "day"]}
          toolbar={false}
        />
      </div>

      {/* Location Legend */}
      {locationLegend.length > 0 && (
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-medium text-gray-900">Locations</h3>
          <div className="flex flex-wrap gap-3">
            {locationLegend.map(({ location, color, isTrip, id }) => (
              <div key={`${isTrip ? 'trip' : 'subtrip'}-${id}`} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700">
                  {location}
                  <span className="ml-1 text-xs text-gray-500">
                    {isTrip ? '(Trip)' : '(Location)'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTripModal && (
        <TripModal
          open={showTripModal}
          onClose={() => setShowTripModal(false)}
        />
      )}
    </div>
  );
}
