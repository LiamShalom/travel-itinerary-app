"use client";

import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plane, Bed, MapPin, Coffee, StickyNote, Edit, Trash2, Plus } from "lucide-react";
import TripModal from "@/components/modals/trip-modal";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { createClient } from "@/lib/supabase/client";

interface CalendarViewProps {
  trips: Trip[];
  itineraryItems: ItineraryItem[];
  subtrips?: Subtrip[];
  onEditItem?: (item: ItineraryItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: (dateString: string, subtrip?: Subtrip) => void;
  onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
}

export default function CalendarView({ trips, itineraryItems, subtrips = [], onEditItem, onDeleteItem, onAddItem, onUpdateItem }: CalendarViewProps) {
  const localizer = useMemo(() => {
    return momentLocalizer(moment);
  }, []);
  
  // Calculate initial date based on earliest trip or current date if no trips
  const initialDate = useMemo(() => {
    if (trips.length === 0) {
      return new Date();
    }
    
    // Find the earliest trip start date
    const earliestTrip = trips.reduce((earliest, trip) => {
      const tripDate = moment(trip.start_date);
      const earliestDate = moment(earliest.start_date);
      return tripDate.isBefore(earliestDate) ? trip : earliest;
    });
    
    // Parse the date string carefully to avoid timezone issues
    if (typeof earliestTrip.start_date === 'string') {
      const dateParts = earliestTrip.start_date.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        const localDate = new Date(year, month, day);
        return localDate;
      }
    }
    
    // Fallback to moment parsing
    const tripStartDate = moment(earliestTrip.start_date).toDate();
    return tripStartDate;
  }, [trips]);
  
  const [showTripModal, setShowTripModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentView, setCurrentView] = useState<View>('month');
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null);
  const [localItineraryItems, setLocalItineraryItems] = useState<ItineraryItem[]>(itineraryItems);

  // Update local state when props change
  useEffect(() => {
    setLocalItineraryItems(itineraryItems);
  }, [itineraryItems]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update currentDate when trips change or initialDate is calculated
  useEffect(() => {
    setCurrentDate(initialDate);
  }, [initialDate]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged item
    const item = localItineraryItems.find(item => item.id === active.id);
    setDraggedItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedItem(null);

    if (!over || !active) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping on a different day
    if (activeId !== overId && overId.startsWith('day-')) {
      const targetDateString = overId.replace('day-', '');
      const itemToMove = localItineraryItems.find(item => item.id === activeId);
      
      if (itemToMove) {
        // Parse the original time to preserve hours/minutes
        const originalDateTime = moment(itemToMove.start_time);
        const targetDate = moment(targetDateString);
        
        // Preserve the time but change the date
        const newStartTime = targetDate
          .clone()
          .hour(originalDateTime.hour())
          .minute(originalDateTime.minute())
          .second(originalDateTime.second());

        const newEndTime = itemToMove.end_time 
          ? targetDate
              .clone()
              .hour(moment(itemToMove.end_time).hour())
              .minute(moment(itemToMove.end_time).minute())
              .second(moment(itemToMove.end_time).second())
          : null;

        // Update local state immediately for UI responsiveness
        const updatedItems = localItineraryItems.map(item =>
          item.id === activeId
            ? {
                ...item,
                start_time: newStartTime.toISOString(),
                end_time: newEndTime ? newEndTime.toISOString() : undefined,
              }
            : item
        );
        setLocalItineraryItems(updatedItems);

        // Update the database
        const supabase = createClient();
        const { error } = await supabase
          .from('itinerary_items')
          .update({ 
            start_time: newStartTime.format('YYYY-MM-DD HH:mm:ss'),
            end_time: newEndTime ? newEndTime.format('YYYY-MM-DD HH:mm:ss') : null
          })
          .eq('id', activeId);

        if (error) {
          console.error('Error updating item date:', error);
          // Revert local state if database update failed
          setLocalItineraryItems(itineraryItems);
          alert('Failed to move item. Please try again.');
        } else if (onUpdateItem) {
          // Notify parent component of the update
          onUpdateItem(activeId, {
            start_time: newStartTime.toISOString(),
            end_time: newEndTime ? newEndTime.toISOString() : undefined,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (calendarWrapperRef.current) {
      const buttons = calendarWrapperRef.current.querySelectorAll('.rbc-toolbar button');

      buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
          // Button click handler
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
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setCurrentView(newView);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[]; action: string }) => {
    // If user clicks on a day (not dragging/selecting multiple days)
    if (slotInfo.action === 'click' || slotInfo.action === 'select') {
      // Navigate to the clicked date
      setCurrentDate(slotInfo.start);
      // Switch to day view
      setCurrentView('day');
    }
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

  // Calculate dynamic calendar height based on number of weeks
  const calendarHeight = useMemo(() => {
    const weeksInMonth = Math.ceil((moment(currentDate).endOf('month').date() + moment(currentDate).startOf('month').day()) / 7);
    const baseHeightPerWeek = 80; // 80px per week since 5 weeks = 400px looks perfect
    return weeksInMonth * baseHeightPerWeek;
  }, [currentDate]);

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
            {currentView === 'day' 
              ? moment(currentDate).format('dddd, MMMM Do, YYYY')
              : currentView === 'week'
              ? `${moment(currentDate).startOf('week').format('MMM D')} - ${moment(currentDate).endOf('week').format('MMM D, YYYY')}`
              : moment(currentDate).format('MMMM YYYY')
            }
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

  // Only show events in day and week view, not in month view to avoid cluttered awards
  const events = currentView === 'day' || currentView === 'week' ? [
    ...localItineraryItems.map((item) => ({
      id: item.id,
      title: `${item.type}: ${item.title}`,
      start: new Date(item.start_time),
      end: item.end_time ? new Date(item.end_time) : new Date(item.start_time),
      resource: { type: "item", data: item },
    })),
  ] : [];

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
    // Special case: For main trips, always use dark grey
    if (isTrip) {
      return '#374151'; // Dark grey for main trip destinations
    }

    // First check if there's a custom color (for subtrips)
    if (locationColorMap.has(location)) {
      return locationColorMap.get(location)!;
    }

    // Use expanded color palette for better uniqueness (fallback for subtrips without custom colors)
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

  // Create a map of dates to locations with metadata (prioritize subtrips over trips)
  const dateLocationMap = useMemo(() => {
    const map = new Map<string, { location: string; isTrip: boolean; id: string }>();

    // First, map all trip dates to trip destination (fallback)
    trips.forEach((trip) => {
      const start = moment(trip.start_date);
      const end = moment(trip.end_date);
      const current = start.clone();

      while (current.isSameOrBefore(end, 'day')) {
        map.set(current.format('YYYY-MM-DD'), {
          location: trip.destination,
          isTrip: true,
          id: trip.id,
        });
        current.add(1, 'day');
      }
    });

    // Then override with subtrip locations (more specific)
    subtrips.forEach((subtrip) => {
      const start = moment(subtrip.start_date);
      const end = moment(subtrip.end_date);
      const current = start.clone();

      while (current.isSameOrBefore(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD');
        map.set(dateStr, {
          location: subtrip.location,
          isTrip: false,
          id: subtrip.id,
        });
        current.add(1, 'day');
      }
    });

    return map;
  }, [trips, subtrips]);

  // Custom day cell wrapper to add background colors and event count badges
  const dayPropGetter = (date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const locationData = dateLocationMap.get(dateStr);
    
    // Count events for this day
    const dayStart = moment(date).startOf('day');
    const dayEnd = moment(date).endOf('day');
    const eventCount = events.filter(event => {
      const eventDate = moment(event.start);
      return eventDate.isBetween(dayStart, dayEnd, null, '[]');
    }).length;

    if (locationData) {
      const color = getLocationColor(locationData.location, locationData.isTrip, locationData.id);
      return {
        style: {
          backgroundColor: `${color}40`, // 40 is hex for ~25% opacity - much more visible
          border: `2px solid ${color}80`, // Add a border with 50% opacity for extra visibility
          borderRadius: '4px',
          fontWeight: 'bold' as const,
          color: '#000', // Ensure text is readable
          position: 'relative' as const,
        },
        children: eventCount > 0 ? (
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: color,
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {eventCount}
          </div>
        ) : undefined,
      };
    }

    // For days without location data but with events, show a simple badge
    if (eventCount > 0) {
      return {
        style: {
          position: 'relative' as const,
        },
        children: (
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#6B7280',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {eventCount}
          </div>
        ),
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

  // Type icons for day view
  const typeIcons = {
    flight: { icon: Plane, color: "text-blue-600" },
    stay: { icon: Bed, color: "text-green-600" },
    activity: { icon: MapPin, color: "text-purple-600" },
    food: { icon: Coffee, color: "text-orange-600" },
    note: { icon: StickyNote, color: "text-gray-600" },
  };

  // Draggable item component
  const DraggableItem = ({ item, children }: { item: ItineraryItem, children: React.ReactNode }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: item.id,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`${isDragging ? 'opacity-50' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Droppable day component
  const DroppableDay = ({ dayId, children }: { dayId: string, children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: dayId,
    });

    return (
      <div
        ref={setNodeRef}
        className={`${isOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''} transition-colors`}
      >
        {children}
      </div>
    );
  };

  // Custom week view component
  const CustomWeekView = () => {
    const weekStart = moment(currentDate).startOf('week');
    const weekEnd = moment(currentDate).endOf('week');
    
    // Generate array of days in the week
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(weekStart.clone().add(i, 'days'));
    }

    return (
      <div className="space-y-2">
        {weekDays.map((day) => {
          const dayStart = day.clone().startOf('day');
          const dayEnd = day.clone().endOf('day');
          
          // Filter events for this specific day
          const dayEvents = events.filter(event => {
            const eventDate = moment(event.start);
            return eventDate.isBetween(dayStart, dayEnd, null, '[]');
          });

          // Find the subtrip for this day
          const dateStr = day.format('YYYY-MM-DD');
          const currentSubtrip = subtrips.find(subtrip => {
            const subtripStart = moment(subtrip.start_date);
            const subtripEnd = moment(subtrip.end_date);
            return day.isBetween(subtripStart, subtripEnd, null, '[]');
          });

          const handleAddEvent = () => {
            const dateString = day.format('YYYY-MM-DD');
            if (onAddItem) {
              onAddItem(dateString, currentSubtrip);
            }
          };

          const isToday = day.isSame(moment(), 'day');
          const isCurrentMonth = day.isSame(moment(currentDate), 'month');

          return (
            <DroppableDay key={day.format('YYYY-MM-DD')} dayId={`day-${day.format('YYYY-MM-DD')}`}>
              <div className={`border rounded-lg p-3 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                {/* Day Header */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className={`font-semibold text-sm ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day.format('dddd')}
                      </h4>
                      <p className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {day.format('MMMM Do, YYYY')}
                      </p>
                    </div>
                    {currentSubtrip && (
                      <div className="text-xs text-gray-500">
                        📍 {currentSubtrip.location}
                      </div>
                    )}
                  </div>
                  {onAddItem && (
                    <Button
                      size="sm"
                      onClick={handleAddEvent}
                      className="flex items-center gap-1 h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  )}
                </div>

                {/* Events List */}
                {dayEvents.length > 0 ? (
                  <div className="space-y-1">
                    {dayEvents.map((event) => {
                      const item = event.resource.data as ItineraryItem;
                      const typeConfig = typeIcons[item.type] || typeIcons.activity;
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <DraggableItem key={event.id} item={item}>
                          <div className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 group cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color} flex-shrink-0`} />
                              <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                            </div>
                            {(onEditItem || onDeleteItem) && (
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onEditItem && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditItem(item);
                                    }}
                                    className="p-1 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit className="h-3 w-3 text-blue-500" />
                                  </button>
                                )}
                                {onDeleteItem && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteItem(item.id);
                                    }}
                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </DraggableItem>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3 text-gray-400">
                    <MapPin className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs">No events planned</p>
                  </div>
                )}
              </div>
            </DroppableDay>
          );
        })}
      </div>
    );
  };

  // Custom day view component
  const CustomDayView = () => {
    const dayStart = moment(currentDate).startOf('day');
    const dayEnd = moment(currentDate).endOf('day');
    
    // Filter events for this specific day
    const dayEvents = events.filter(event => {
      const eventDate = moment(event.start);
      return eventDate.isBetween(dayStart, dayEnd, null, '[]');
    });

    // Find the subtrip for this day
    const dateStr = moment(currentDate).format('YYYY-MM-DD');
    const currentSubtrip = subtrips.find(subtrip => {
      const subtripStart = moment(subtrip.start_date);
      const subtripEnd = moment(subtrip.end_date);
      const currentDay = moment(currentDate);
      return currentDay.isBetween(subtripStart, subtripEnd, null, '[]');
    });

    const handleAddEvent = () => {
      // Pass the date as a string to avoid any timezone conversion issues
      const dateString = moment(currentDate).format('YYYY-MM-DD');
      if (onAddItem) {
        onAddItem(dateString, currentSubtrip);
      }
    };

    return (
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {moment(currentDate).format('dddd, MMMM Do')}
            </h3>
            {currentSubtrip && (
              <p className="text-sm text-gray-500 mt-1">
                📍 {currentSubtrip.location}
              </p>
            )}
          </div>
          {onAddItem && (
            <Button onClick={handleAddEvent} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          )}
        </div>

        {/* Events List */}
        {dayEvents.length > 0 ? (
          <div className="space-y-3">
            {dayEvents.map((event) => {
              const item = event.resource.data as ItineraryItem;
              const typeConfig = typeIcons[item.type] || typeIcons.activity;
              const TypeIcon = typeConfig.icon;
              
              return (
                <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow group">
                  <div className="flex items-center gap-3">
                    <TypeIcon className={`h-5 w-5 ${typeConfig.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                      {item.location && (
                        <p className="text-sm text-gray-500 truncate">{item.location}</p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                    {item.cost && (
                      <div className="text-sm font-medium text-gray-900 flex-shrink-0">
                        ${item.cost.toFixed(0)}
                      </div>
                    )}
                    {(onEditItem || onDeleteItem) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditItem && (
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                          </button>
                        )}
                        {onDeleteItem && (
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No events planned for this day</p>
            {onAddItem && (
              <Button onClick={handleAddEvent} className="flex items-center gap-2 mx-auto">
                <Plus className="h-4 w-4" />
                Add Your First Event
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Itinerary</h2>
        </div>

        <div ref={calendarWrapperRef} className="modern-card p-4 calendar-wrapper">
          <CustomToolbar />
          
          {currentView === 'day' ? (
            <CustomDayView />
          ) : currentView === 'week' ? (
            <CustomWeekView />
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: calendarHeight }}
              date={currentDate}
              view={currentView}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              popup
              views={["month"]}
              toolbar={false}
            />
          )}
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

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedItem ? (
          <div className="bg-white border rounded-lg p-2 shadow-lg opacity-90">
            <div className="flex items-center gap-2">
              {(() => {
                const typeConfig = typeIcons[draggedItem.type] || typeIcons.activity;
                const TypeIcon = typeConfig.icon;
                return <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />;
              })()}
              <span className="text-sm font-medium text-gray-900">{draggedItem.title}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
