"use client";

import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plane, Bed, MapPin, Coffee, StickyNote, Edit, Trash2, Plus, Car, ShoppingBag, Building, Users, Ticket, Train, Utensils, Camera, Calendar as CalendarIcon, TreePine, Palette, Heart, Clock, CheckCircle } from "lucide-react";
import TripModal from "@/components/modals/trip-modal";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  DragEndEvent,
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
import styles from "@/styles/components/calendar/calendar-view.module.css";

interface CalendarViewProps {
  trips: Trip[];
  itineraryItems: ItineraryItem[];
  subtrips?: Subtrip[];
  onEditItem?: (item: ItineraryItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: (dateString: string, subtrip?: Subtrip) => void;
  onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
  onDayClick?: (date: Date) => void;
}

export default function CalendarView({ trips, itineraryItems, subtrips = [], onEditItem, onDeleteItem, onAddItem, onUpdateItem, onDayClick }: CalendarViewProps) {
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
  const [dateInitialized, setDateInitialized] = useState(false);
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

  // Update currentDate only once when component mounts or when trips first load
  useEffect(() => {
    if (!dateInitialized && trips.length > 0) {
      setCurrentDate(initialDate);
      setDateInitialized(true);
    }
  }, [initialDate, trips.length, dateInitialized]);

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

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[]; action: string }) => {
    // If user clicks on a day (not dragging/selecting multiple days)
    if (slotInfo.action === 'click' || slotInfo.action === 'select') {
      // Check if the clicked date is part of a trip (has location data)
      const dateStr = moment(slotInfo.start).format('YYYY-MM-DD');
      const locationData = dateLocationMap.get(dateStr);
      
      // Only navigate if the day is part of a trip
      if (locationData && onDayClick) {
        // Navigate to the clicked date
        setCurrentDate(slotInfo.start);
        // Call onDayClick to navigate to itinerary tab
        onDayClick(slotInfo.start);
      }
    }
  };

  const navigatePrevious = () => {
    const newDate = moment(currentDate).subtract(1, 'month').toDate();
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = moment(currentDate).add(1, 'month').toDate();
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
      <div className={styles.toolbar}>
        {/* Navigation */}
        <div className={styles.toolbarNav}>
          <button
            onClick={navigatePrevious}
            className={styles.navButton}
            aria-label="Previous month"
          >
            <ChevronLeft className={styles.navIcon} />
          </button>
          <h3 className={styles.toolbarTitle}>
            {moment(currentDate).format('MMMM YYYY')}
          </h3>
          <button
            onClick={navigateNext}
            className={styles.navButton}
            aria-label="Next month"
          >
            <ChevronRight className={styles.navIcon} />
          </button>
        </div>
      </div>
    );
  };

  // No events in month view to avoid clutter - events are shown via day styling instead
  const events: any[] = [];

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
    
    // Get events for this day
    const dayStart = moment(date).startOf('day');
    const dayEnd = moment(date).endOf('day');
    const dayEvents = itineraryItems.filter(item => {
      const eventDate = moment(item.start_time);
      return eventDate.isBetween(dayStart, dayEnd, null, '[]');
    });

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
          cursor: 'pointer', // Make trip days clickable
          transition: 'all 0.2s ease', // Smooth hover transition
        },
        className: 'trip-day-clickable', // Add a class for potential additional styling
        children: (
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              zIndex: 10,
            }}
          >
            {/* Event icons grid */}
            {dayEvents.length > 0 && (
              <div 
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  marginBottom: '2px',
                }}
              >
                {dayEvents.slice(0, 8).map((item, index) => {
                  const typeConfig = typeIcons[item.type] || typeIcons.activity;
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer'
                      }}
                      title={`${item.type}: ${item.title}${item.location ? ` at ${item.location}` : ''}`}
                    >
                      <TypeIcon 
                        style={{
                          width: '8px',
                          height: '8px',
                        }}
                        className={typeConfig.color}
                      />
                    </div>
                  );
                })}
                {dayEvents.length > 8 && (
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      fontSize: '8px',
                      fontWeight: 'bold'
                    }}
                    title={`+${dayEvents.length - 8} more events`}
                  >
                    +{dayEvents.length - 8}
                  </div>
                )}
              </div>
            )}
            {/* Event count badge */}
            {dayEvents.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '0px',
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
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {dayEvents.length}
              </div>
            )}
          </div>
        ),
      };
    }

    // For days without location data but with events, show icons and a simple badge
    if (dayEvents.length > 0) {
      return {
        style: {
          position: 'relative' as const,
        },
        children: (
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              zIndex: 10,
            }}
          >
            {/* Event icons grid */}
            <div 
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2px',
                marginBottom: '2px',
              }}
            >
              {dayEvents.slice(0, 8).map((item, index) => {
                const typeConfig = typeIcons[item.type] || typeIcons.activity;
                const TypeIcon = typeConfig.icon;
                return (
                  <div
                    key={`${item.id}-${index}`}
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer'
                    }}
                    title={`${item.type}: ${item.title}${item.location ? ` at ${item.location}` : ''}`}
                  >
                    <TypeIcon 
                      style={{
                        width: '8px',
                        height: '8px',
                      }}
                      className={typeConfig.color}
                    />
                  </div>
                );
              })}
              {dayEvents.length > 8 && (
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '8px',
                    fontWeight: 'bold'
                  }}
                  title={`+${dayEvents.length - 8} more events`}
                >
                  +{dayEvents.length - 8}
                </div>
              )}
            </div>
            {/* Event count badge */}
            <div 
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '0px',
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {dayEvents.length}
            </div>
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

  // Custom month date header component
  const CustomDateHeader = ({ date }: { date: Date }) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    
    // Get events for this day
    const dayStart = moment(date).startOf('day');
    const dayEnd = moment(date).endOf('day');
    const dayEvents = itineraryItems.filter(item => {
      const eventDate = moment(item.start_time);
      return eventDate.isBetween(dayStart, dayEnd, null, '[]');
    });

    return (
      <div className={styles.dateHeader}>
        {/* Day number */}
        <span className={styles.dateNumber}>{moment(date).format('D')}</span>
        
        {/* Event icons */}
        {dayEvents.length > 0 && (
          <div className={styles.eventIcons}>
            <div className={styles.eventIconsGrid}>
              {dayEvents.slice(0, 6).map((item, index) => {
                const typeConfig = typeIcons[item.type] || typeIcons.activity;
                const TypeIcon = typeConfig.icon;
                return (
                  <div
                    key={`${item.id}-${index}`}
                    style={{ width: 'calc(33.333% - 2px)', padding: '1px' }}
                    title={`${item.type}: ${item.title}${item.location ? ` at ${item.location}` : ''}`}
                  >
                    <TypeIcon 
                      className={styles.eventIcon}
                    />
                  </div>
                );
              })}
              {dayEvents.length > 6 && (
                <div
                  className={styles.moreEventsIndicator}
                  title={`+${dayEvents.length - 6} more events`}
                >
                  +{dayEvents.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  const typeIcons = {
    flight: { icon: Plane, color: styles.iconBlue },
    transport: { icon: Train, color: styles.iconIndigo },
    accommodation: { icon: Bed, color: styles.iconGreen },
    meal: { icon: Utensils, color: styles.iconOrange },
    activity: { icon: MapPin, color: styles.iconPurple },
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
        className={isDragging ? styles.dragging : ''}
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
        className={isOver ? styles.dropTarget : ''}
      >
        {children}
      </div>
    );
  };

  // Custom week view component - now a scrollable itinerary
  const CustomWeekView = () => {
    const [visibleDays, setVisibleDays] = useState(() => {
      // If no trips, return empty array
      if (trips.length === 0) return [];
      
      // Find the earliest and latest dates across all trips
      const allDates = trips.flatMap(trip => [trip.start_date, trip.end_date]);
      const earliestDate = moment.min(allDates.map(date => moment(date)));
      const latestDate = moment.max(allDates.map(date => moment(date)));
      
      const days = [];
      const currentDay = earliestDate.clone();
      
      while (currentDay.isSameOrBefore(latestDate, 'day')) {
        days.push(currentDay.clone());
        currentDay.add(1, 'day');
      }
      
      return days;
    });

    // Find the most recently added item for initial scroll position
    const mostRecentItem = localItineraryItems.length > 0 
      ? localItineraryItems.reduce((latest, item) => {
          return moment(item.created_at).isAfter(moment(latest.created_at)) ? item : latest;
        })
      : null;

    // Scroll to most recent item's day on mount
    useEffect(() => {
      const recentItemElement = document.getElementById('recent-item-marker');
      if (recentItemElement) {
        recentItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, []);

    return (
      <div className={styles.weekView}>
        <div className={styles.weekViewContent}>
          {visibleDays.map((day) => {
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

            // Find the most recently added item
            const mostRecentItem = localItineraryItems.length > 0 
              ? localItineraryItems.reduce((latest, item) => {
                  return moment(item.created_at).isAfter(moment(latest.created_at)) ? item : latest;
                })
              : null;

            const isToday = day.isSame(moment(), 'day');
            const isRecentItemDay = mostRecentItem && day.isSame(moment(mostRecentItem.start_time), 'day');
            const isPast = day.isBefore(moment(), 'day');
            const isFuture = day.isAfter(moment(), 'day');

            return (
              <DroppableDay key={day.format('YYYY-MM-DD')} dayId={`day-${day.format('YYYY-MM-DD')}`}>
                <div 
                  id={isRecentItemDay ? 'recent-item-marker' : undefined}
                  className={`${styles.dayCard} ${
                    isToday
                      ? styles.dayCardCurrent
                      : isPast 
                      ? styles.dayCardPast
                      : styles.dayCardFuture
                  }`}
                >
                  {/* Day Header */}
                  <div className={styles.dayHeader}>
                    <div className={styles.dayInfo}>
                      <div>
                        <h4 className={`${styles.dayTitle} ${
                          isToday 
                            ? styles.dayTitleCurrent
                            : isPast 
                            ? styles.dayTitlePast
                            : styles.dayTitleFuture
                        }`}>
                          {day.format('dddd')}
                          {isToday && <span className={styles.todayBadge}>Today</span>}
                        </h4>
                        <p className={`${styles.daySubtitle} ${
                          isToday 
                            ? styles.daySubtitleCurrent
                            : styles.daySubtitleFuture
                        }`}>
                          {day.format('MMMM Do, YYYY')}
                        </p>
                      </div>
                      {currentSubtrip && (
                        <div className={styles.subtripBadge}>
                          📍 {currentSubtrip.location}
                        </div>
                      )}
                    </div>
                    {onAddItem && !isPast && (
                      <Button
                        size="sm"
                        onClick={handleAddEvent}
                        className={styles.addEventButton}
                        variant={isToday ? "default" : "outline"}
                      >
                        <Plus className={styles.addEventIcon} />
                        Add
                      </Button>
                    )}
                  </div>

                  {/* Events List */}
                  {dayEvents.length > 0 ? (
                    <div className={styles.eventsList}>
                      {dayEvents.map((event) => {
                        const item = event.resource.data as ItineraryItem;
                        const typeConfig = typeIcons[item.type] || typeIcons.activity;
                        const TypeIcon = typeConfig.icon;
                        
                        return (
                          <DraggableItem key={event.id} item={item}>
                            <div className={`${styles.eventItem} ${
                              isPast ? styles.eventItemPast : styles.eventItemFuture
                            }`}>
                              <div className={styles.eventContent}>
                                <TypeIcon className={`${styles.eventIcon} ${typeConfig.color} ${isPast ? styles.eventIconPast : ''}`} />
                                <div className={styles.eventDetails}>
                                  <span className={`${styles.eventTitle} ${isPast ? styles.eventTitlePast : styles.eventTitleFuture}`}>
                                    {item.title}
                                  </span>
                                  {item.location && (
                                    <span className={`${styles.eventSubtitle} ${isPast ? styles.eventSubtitlePast : styles.eventSubtitleFuture}`}>
                                      {item.location}
                                    </span>
                                  )}
                                </div>
                                {item.cost && (
                                  <span className={`${styles.eventCost} ${isPast ? styles.eventCostPast : styles.eventCostFuture}`}>
                                    ${item.cost.toFixed(0)}
                                  </span>
                                )}
                              </div>
                              {(onEditItem || onDeleteItem) && !isPast && (
                                <div className={styles.eventActions}>
                                  {onEditItem && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditItem(item);
                                      }}
                                      className={`${styles.actionButton} ${styles.editButton}`}
                                    >
                                      <Edit className={styles.editIcon} />
                                    </button>
                                  )}
                                  {onDeleteItem && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteItem(item.id);
                                      }}
                                      className={`${styles.actionButton} ${styles.deleteButton}`}
                                    >
                                      <Trash2 className={styles.deleteIcon} />
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
                    <div className={`${styles.emptyState} ${isPast ? styles.emptyStatePast : ''}`}>
                      <MapPin className={`${styles.emptyIcon} ${isPast ? styles.emptyIconPast : styles.emptyIconFuture}`} />
                      <p className={`${styles.emptyText} ${isPast ? styles.emptyTextPast : styles.emptyTextFuture}`}>
                        {isPast ? 'No events' : 'No events planned'}
                      </p>
                    </div>
                  )}
                </div>
              </DroppableDay>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={calendarWrapperRef} className={styles.calendarWrapper}>
        <CustomToolbar />
        
        <Calendar
          localizer={localizer}
          events={[]} // No events in month view to avoid clutter
          startAccessor="start"
          endAccessor="end"
          style={{ height: calendarHeight }}
          date={currentDate}
          view="month"
          onNavigate={handleNavigate}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          popup
          views={["month"]}
          toolbar={false}
          components={{
            month: {
              dateHeader: CustomDateHeader,
            }
          }}
        />

        {/* Location Legend */}
        {locationLegend.length > 0 && (
          <div className={styles.locationLegend}>
            <h3 className={styles.locationLegendTitle}>Locations</h3>
            <div className={styles.locationLegendGrid}>
              {locationLegend.map(({ location, color, isTrip, id }) => (
                <div key={`${isTrip ? 'trip' : 'subtrip'}-${id}`} className={styles.locationLegendItem}>
                  <div
                    className={styles.locationColor}
                    style={{ backgroundColor: color }}
                  />
                  <span className={styles.locationText}>
                    {location}
                    <span className={styles.locationSubtext}>
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
    </DndContext>
  );
}
