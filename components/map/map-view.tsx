"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Subtrip } from "@/lib/types/database";

interface MapViewProps {
  destination?: string;
  subtrips?: Subtrip[];
}

export default function MapView({ destination, subtrips = [] }: MapViewProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Geocode destination and center map
  const geocodeDestination = async (destination: string) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !destination.trim()) return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${token}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          return { lng, lat };
        }
      }
    } catch (error) {
      console.error('Error geocoding destination:', error);
    }
    return null;
  };

  // Geocode multiple subtrip locations
  const geocodeSubtrips = async (subtrips: Subtrip[]) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !subtrips.length) return [];

    const geocodedSubtrips = [];
    
    for (const subtrip of subtrips) {
      if (!subtrip.location.trim()) continue;
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(subtrip.location)}.json?access_token=${token}&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            geocodedSubtrips.push({
              ...subtrip,
              coordinates: { lng, lat }
            });
          }
        }
      } catch (error) {
        console.error(`Error geocoding subtrip location ${subtrip.location}:`, error);
      }
    }
    
    return geocodedSubtrips;
  };

  // Clear all existing markers
  const clearMarkers = () => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
  };

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

    const initializeMap = async () => {
      try {
        // Try to geocode destination and subtrips
        let center: [number, number] = [-98.5795, 39.8283]; // Default center (US)
        let zoom = 3;
        
        const destinationCoords = destination ? await geocodeDestination(destination) : null;
        const geocodedSubtrips = await geocodeSubtrips(subtrips);
        
        // Collect all coordinates for bounds calculation
        const allCoords: Array<{ lng: number; lat: number }> = [];
        
        if (destinationCoords) {
          allCoords.push(destinationCoords);
        }
        
        geocodedSubtrips.forEach(subtrip => {
          if (subtrip.coordinates) {
            allCoords.push(subtrip.coordinates);
          }
        });
        
        // Set center and zoom based on available coordinates
        if (allCoords.length > 0) {
          if (allCoords.length === 1) {
            // Single location - center on it
            center = [allCoords[0].lng, allCoords[0].lat];
            zoom = 10;
          } else {
            // Multiple locations - calculate center
            const avgLng = allCoords.reduce((sum, coord) => sum + coord.lng, 0) / allCoords.length;
            const avgLat = allCoords.reduce((sum, coord) => sum + coord.lat, 0) / allCoords.length;
            center = [avgLng, avgLat];
            zoom = 6;
          }
        }

        map.current = new mapboxgl.Map({
          container: mapContainer,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
        
        map.current.on('load', () => {
          // Clear any existing markers
          clearMarkers();
          
          // Add destination marker if available
          if (destinationCoords && destination) {
            const destinationMarker = new mapboxgl.Marker({ 
              color: '#374151', // Dark grey for main destination - easily distinguishable
              scale: 1.4 // Larger scale to make it stand out more
            })
              .setLngLat([destinationCoords.lng, destinationCoords.lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="font-semibold text-sm">${destination}</div>
                <div class="text-xs text-gray-600">Main Destination</div>
              `))
              .addTo(map.current!);
              
            markers.current.push(destinationMarker);
          }
          
          // Add subtrip markers
          geocodedSubtrips.forEach((subtrip) => {
            if (subtrip.coordinates) {
              const markerColor = subtrip.color || '#3b82f6'; // Use subtrip color or default blue
              
              const subtripMarker = new mapboxgl.Marker({ 
                color: markerColor,
                scale: 1.0 
              })
                .setLngLat([subtrip.coordinates.lng, subtrip.coordinates.lat])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="font-semibold text-sm">${subtrip.location}</div>
                  <div class="text-xs text-gray-600">
                    ${new Date(subtrip.start_date).toLocaleDateString()} - ${new Date(subtrip.end_date).toLocaleDateString()}
                  </div>
                  ${subtrip.description ? `<div class="text-xs text-gray-500 mt-1">${subtrip.description}</div>` : ''}
                `))
                .addTo(map.current!);
                
              markers.current.push(subtripMarker);
            }
          });
          
          // Fit bounds to show all markers if we have multiple locations
          if (allCoords.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            allCoords.forEach(coord => {
              bounds.extend([coord.lng, coord.lat]);
            });
            
            map.current!.fitBounds(bounds, {
              padding: 50,
              maxZoom: 12
            });
          }
          
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
    };

    initializeMap();

    return () => {
      clearMarkers();
      map.current?.remove();
      map.current = null;
    };
  }, [hasToken, mapContainer, destination]);

  // Separate effect to handle real-time subtrip updates
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

    const updateSubtripMarkers = async () => {
      try {
        // Clear existing subtrip markers (keep destination marker)
        const destinationMarkerIndex = markers.current.findIndex((marker, index) => {
          // The destination marker is typically the first one if it exists
          return index === 0 && destination;
        });
        
        // Remove all markers except the destination marker
        const destinationMarker = destinationMarkerIndex >= 0 ? markers.current[destinationMarkerIndex] : null;
        clearMarkers();
        
        if (destinationMarker) {
          markers.current.push(destinationMarker);
        }

        // Re-add destination marker if it doesn't exist but should
        if (destination && !destinationMarker) {
          const destinationCoords = await geocodeDestination(destination);
          if (destinationCoords) {
            const newDestinationMarker = new mapboxgl.Marker({ 
              color: '#374151', // Dark grey for main destination - easily distinguishable
              scale: 1.4 // Larger scale to make it stand out more
            })
              .setLngLat([destinationCoords.lng, destinationCoords.lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="font-semibold text-sm">${destination}</div>
                <div class="text-xs text-gray-600">Main Destination</div>
              `))
              .addTo(map.current!);
              
            markers.current.push(newDestinationMarker);
          }
        }

        // Add updated subtrip markers
        const geocodedSubtrips = await geocodeSubtrips(subtrips);
        const allCoords: Array<{ lng: number; lat: number }> = [];
        
        if (destination) {
          const destinationCoords = await geocodeDestination(destination);
          if (destinationCoords) {
            allCoords.push(destinationCoords);
          }
        }
        
        geocodedSubtrips.forEach((subtrip) => {
          if (subtrip.coordinates) {
            allCoords.push(subtrip.coordinates);
            
            const markerColor = subtrip.color || '#3b82f6';
            const subtripMarker = new mapboxgl.Marker({ 
              color: markerColor,
              scale: 1.0 
            })
              .setLngLat([subtrip.coordinates.lng, subtrip.coordinates.lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="font-semibold text-sm">${subtrip.location}</div>
                <div class="text-xs text-gray-600">
                  ${new Date(subtrip.start_date).toLocaleDateString()} - ${new Date(subtrip.end_date).toLocaleDateString()}
                </div>
                ${subtrip.description ? `<div class="text-xs text-gray-500 mt-1">${subtrip.description}</div>` : ''}
              `))
              .addTo(map.current!);
              
            markers.current.push(subtripMarker);
          }
        });

        // Update map bounds if we have multiple locations
        if (allCoords.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          allCoords.forEach(coord => {
            bounds.extend([coord.lng, coord.lat]);
          });
          
          map.current!.fitBounds(bounds, {
            padding: 50,
            maxZoom: 12
          });
        }
      } catch (error) {
        console.error('Error updating subtrip markers:', error);
      }
    };

    updateSubtripMarkers();
  }, [subtrips, destination]); // Re-run when subtrips change

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
