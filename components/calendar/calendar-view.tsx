"use client";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Trip, ItineraryItem } from "@/lib/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import TripModal from "@/components/modals/trip-modal";
import ItineraryModal from "@/components/modals/itinerary-modal";

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  trips: Trip[];
  itineraryItems: ItineraryItem[];
}

export default function CalendarView({ trips, itineraryItems }: CalendarViewProps) {
  const [showTripModal, setShowTripModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  const events = [
    ...trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      start: new Date(trip.start_date),
      end: new Date(trip.end_date),
      resource: { type: "trip", data: trip },
    })),
    ...itineraryItems.map((item) => ({
      id: item.id,
      title: `${item.type}: ${item.title}`,
      start: new Date(item.start_time),
      end: item.end_time ? new Date(item.end_time) : new Date(item.start_time),
      resource: { type: "item", data: item },
    })),
  ];

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedSlot(start);
    setShowItineraryModal(true);
  };

  const eventStyleGetter = (event: any) => {
    const isTrip = event.resource.type === "trip";
    const color = isTrip ? "#3b82f6" : "#10b981";
    
    return {
      style: {
        backgroundColor: color,
        color: "white",
        borderRadius: "4px",
        border: "none",
      },
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Your Itinerary</h2>
        <Button onClick={() => setShowTripModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Trip
        </Button>
      </div>
      
      <Card className="p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          popup
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
        />
      </Card>

      {showTripModal && (
        <TripModal
          open={showTripModal}
          onClose={() => setShowTripModal(false)}
        />
      )}

      {showItineraryModal && selectedSlot && (
        <ItineraryModal
          open={showItineraryModal}
          onClose={() => setShowItineraryModal(false)}
          defaultDate={selectedSlot}
          trips={trips}
        />
      )}
    </div>
  );
}
