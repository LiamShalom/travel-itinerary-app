"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapViewProps {
  destination?: string;
}

export default function MapView({ destination }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setHasToken(false);
      return;
    }

    setHasToken(true);

    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-98.5795, 39.8283], // Center of US as default
        zoom: 3,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } catch (error) {
      console.error("Error initializing Mapbox:", error);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {hasToken ? (
        <div ref={mapContainer} className="w-full h-full rounded-lg" />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
          <div className="text-center p-6 space-y-3">
            <div className="text-4xl">🗺️</div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Map Not Configured
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Add your Mapbox token to .env.local to enable the interactive map
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <code className="bg-gray-200 px-2 py-1 rounded">
                  NEXT_PUBLIC_MAPBOX_TOKEN=your_token
                </code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
