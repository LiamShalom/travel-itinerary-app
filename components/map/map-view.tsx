"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapViewProps {
  destination?: string;
}

export default function MapView({ destination }: MapViewProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Callback ref to ensure we get the element when it's created
  const containerRef = (element: HTMLDivElement | null) => {
    if (element && element !== mapContainer) {
      setMapContainer(element);
    }
  };

  useEffect(() => {
    // Check if mapboxgl is loaded
    if (typeof mapboxgl === 'undefined') {
      setMapError('Mapbox GL library not loaded');
      setIsLoading(false);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setHasToken(false);
      setIsLoading(false);
      setMapError('No Mapbox token found');
      return;
    }

    setHasToken(true);
    setIsLoading(false);
  }, []);

  // Separate effect for map initialization when container is ready
  useEffect(() => {
    if (!hasToken || !mapContainer || map.current) {
      return;
    }
    
    const rect = mapContainer.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) {
      setMapError('Map container has no dimensions');
      setIsLoading(false);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-98.5795, 39.8283],
        zoom: 3,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      
      map.current.on('load', () => {
        setIsLoading(false);
        setMapError(null);
      });

      map.current.on('error', (e) => {
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
        setIsLoading(false);
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMapError(`Initialization error: ${errorMsg}`);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [hasToken, mapContainer]);

  return (
    <div className="relative w-full h-full border border-gray-200 rounded-lg">
      {!hasToken ? (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
          <div className="text-center p-6 space-y-3">
            <div className="text-4xl">🗺️</div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Map Not Configured
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {mapError || 'Add your Mapbox token to .env.local to enable the interactive map'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <code className="bg-gray-200 px-2 py-1 rounded">
                  NEXT_PUBLIC_MAPBOX_TOKEN=your_token
                </code>
              </p>
            </div>
          </div>
        </div>
      ) : mapError ? (
        <div className="flex items-center justify-center w-full h-full bg-red-50 rounded-lg">
          <div className="text-center p-6 space-y-3">
            <div className="text-4xl">❌</div>
            <div>
              <p className="text-sm font-medium text-red-900 mb-1">
                Map Error
              </p>
              <p className="text-xs text-red-600 max-w-xs">
                {mapError}
              </p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-blue-50 rounded-lg">
          <div className="text-center p-6 space-y-3">
            <div className="text-4xl animate-spin">🔄</div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Loading Map...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full rounded-lg" />
      )}
    </div>
  );
}
