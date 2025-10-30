"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Trip, ItineraryItem, Subtrip } from "@/lib/types/database";
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import moment from "moment";
import {
  Plane,
  Bed,
  MapPin,
  Coffee,
  StickyNote,
  Car,
  ShoppingBag,
  Building,
  Users,
  Train,
  Utensils,
  Camera,
  Calendar as CalendarIcon,
  TreePine,
  Heart,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import styles from "@/styles/components/calendar/calendar-view.module.css";

interface ItineraryViewProps {
  trips: Trip[];
  itineraryItems: ItineraryItem[];
  subtrips?: Subtrip[];
  onEditItem?: (item: ItineraryItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: (dateString: string, subtrip?: Subtrip) => void;
  onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
}

export default function ItineraryView({
  trips,
  itineraryItems,
  subtrips = [],
  onEditItem,
  onDeleteItem,
  onAddItem,
  onUpdateItem,
}: ItineraryViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null);
  const [localItineraryItems, setLocalItineraryItems] = useState<ItineraryItem[]>(itineraryItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Update local state when props change
  useEffect(() => {
    setLocalItineraryItems(itineraryItems);
  }, [itineraryItems]);

  // Create events array for the week view
  const events = useMemo(() => [
    ...localItineraryItems.map((item) => ({
      id: item.id,
      title: `${item.type}: ${item.title}`,
      start: new Date(item.start_time),
      end: item.end_time ? new Date(item.end_time) : new Date(item.start_time),
      resource: { type: "item", data: item },
    })),
  ], [localItineraryItems]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
    const item = localItineraryItems.find(item => item.id === active.id);
    setDraggedItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedItem) {
      setActiveId(null);
      setDraggedItem(null);
      return;
    }

    const itemId = String(active.id);
    const newDayId = String(over.id);
    
    // Extract date from day ID (format: "day-YYYY-MM-DD")
    const newDateString = newDayId.replace('day-', '');
    
    if (moment(draggedItem.start_time).format('YYYY-MM-DD') !== newDateString) {
      const newDate = moment(newDateString + 'T12:00:00').toDate();
      const updates = { start_time: newDate.toISOString() };
      
      // Update local state immediately
      setLocalItineraryItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, start_time: newDate.toISOString() }
            : item
        )
      );

      // Update the database
      if (onUpdateItem) {
        try {
          await onUpdateItem(itemId, updates);
        } catch (error) {
          // Revert local state if database update failed
          setLocalItineraryItems(prev => 
            prev.map(item => 
              item.id === itemId 
                ? { ...item, start_time: draggedItem.start_time }
                : item
            )
          );
        }
      }
    }

    setActiveId(null);
    setDraggedItem(null);
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
      opacity: isDragging ? 0.5 : 1,
    } : {};

    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        {children}
      </div>
    );
  };

  // Droppable day component
  const DroppableDay = ({ dayId, children }: { dayId: string, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: dayId,
    });

    return (
      <div ref={setNodeRef}>
        {children}
      </div>
    );
  };

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
      <div className={styles.container}>
        <CustomWeekView />
      </div>
    </DndContext>
  );
}