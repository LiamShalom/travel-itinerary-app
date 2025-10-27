"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";

interface Location {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

interface LocationSelectorProps {
  value: string;
  onChange: (location: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSelector({ 
  value, 
  onChange, 
  placeholder = "Search for a destination...",
  className = ""
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for locations using Mapbox Geocoding API
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token) {
      console.warn('Mapbox token not found, using mock data');
      // Fallback to some common destinations based on query
      const mockResults: Location[] = [];
      const query = searchQuery.toLowerCase();
      
      // Popular destinations that start with the query
      const destinations = [
        { name: 'Japan', country: 'Asia', coords: [139.6917, 35.6895] },
        { name: 'Jamaica', country: 'Caribbean', coords: [-77.2975, 18.1096] },
        { name: 'Jakarta, Indonesia', country: 'Indonesia', coords: [106.8451, -6.2088] },
        { name: 'Paris, France', country: 'France', coords: [2.3522, 48.8566] },
        { name: 'London, United Kingdom', country: 'United Kingdom', coords: [-0.1276, 51.5074] },
        { name: 'New York, USA', country: 'United States', coords: [-74.0060, 40.7128] },
        { name: 'Tokyo, Japan', country: 'Japan', coords: [139.6917, 35.6895] },
        { name: 'Rome, Italy', country: 'Italy', coords: [12.4964, 41.9028] },
        { name: 'Sydney, Australia', country: 'Australia', coords: [151.2093, -33.8688] },
        { name: 'Barcelona, Spain', country: 'Spain', coords: [2.1734, 41.3851] },
      ];

      destinations.forEach((dest, idx) => {
        if (dest.name.toLowerCase().includes(query)) {
          mockResults.push({
            id: `mock-${idx}`,
            place_name: `${dest.name} (Mock)`,
            center: dest.coords as [number, number],
            place_type: ['place'],
          });
        }
      });
      
      setSuggestions(mockResults);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&types=country,region,postcode,district,place,locality,neighborhood&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
      } else {
        console.error('Geocoding API error:', response.statusText);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (isOpen && query.trim().length >= 1) {
        searchLocations(query);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setQuery(location.place_name);
    onChange(location.place_name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (!isOpen && newQuery.trim()) {
      setIsOpen(true);
    }
    
    // If user is typing something different, clear the selection
    if (selectedLocation && newQuery !== selectedLocation.place_name) {
      setSelectedLocation(null);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setSelectedLocation(null);
    setSuggestions([]);
    setIsOpen(false);
  };

  const formatLocationDisplay = (location: Location) => {
    const parts = location.place_name.split(',');
    const main = parts[0];
    const secondary = parts.slice(1).join(',');
    
    return { main, secondary };
  };

  const getLocationIcon = (placeTypes: string[]) => {
    if (placeTypes.includes('country')) return '🌍';
    if (placeTypes.includes('region')) return '🏞️';
    if (placeTypes.includes('place') || placeTypes.includes('locality')) return '🏙️';
    if (placeTypes.includes('neighborhood')) return '🏘️';
    return '📍';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="modern-input w-full pl-10 pr-10 py-2.5"
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <ChevronDown 
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin inline-block h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              <span className="ml-2">Searching for "{query}"...</span>
            </div>
          )}
          
          {!loading && suggestions.length === 0 && query.trim() && query.length >= 1 && (
            <div className="p-4 text-center text-gray-500">
              <div className="text-sm">No locations found for "{query}"</div>
              <div className="text-xs text-gray-400 mt-1">Try a different spelling or more specific location</div>
            </div>
          )}

          {!loading && query.trim() && query.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Start typing to search for destinations worldwide...
            </div>
          )}
          
          {!loading && suggestions.length > 0 && (
            <div className="py-2">
              {suggestions.map((location) => {
                const { main, secondary } = formatLocationDisplay(location);
                const icon = getLocationIcon(location.place_type);
                
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <span className="text-lg mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{main}</div>
                      {secondary && (
                        <div className="text-sm text-gray-500 truncate">{secondary}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}