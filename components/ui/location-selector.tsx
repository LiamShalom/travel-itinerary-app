"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { citiesService, type SearchResult } from "@/lib/services/cities-service";

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
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for locations using Cities Service
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await citiesService.searchLocations(searchQuery, 8);
      setSuggestions(results);
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
      if (query.trim() && query.length >= 1) {
        searchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (location: SearchResult) => {
    setSelectedLocation(location);
    setQuery(location.display_name);
    onChange(location.display_name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setSelectedLocation(null);
    setQuery("");
    onChange("");
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear selected location if query doesn't match
    if (selectedLocation && newQuery !== selectedLocation.display_name) {
      setSelectedLocation(null);
    }
    
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (query.trim()) {
      searchLocations(query);
    }
  };

  // Get icon for location type
  const getLocationIcon = (type: 'country' | 'city') => {
    switch (type) {
      case 'country':
        return '🌍';
      case 'city':
        return '🏙️';
      default:
        return '📍';
    }
  };

  // Format location display with context
  const formatLocationDisplay = (location: SearchResult) => {
    if (location.type === 'country') {
      return (
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="font-medium">{location.name}</div>
            <div className="text-sm text-gray-500">{location.context.region}</div>
          </div>
          <div className="text-lg">{location.context.emoji}</div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="font-medium">{location.name}</div>
          <div className="text-sm text-gray-500">{location.context.state}, {location.context.country}</div>
        </div>
      );
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="modern-input w-full px-4 py-2.5 pr-20"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Searching locations...
            </div>
          )}
          
          {!loading && suggestions.length === 0 && query.trim() && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No locations found for "{query}"
            </div>
          )}
          
          {!loading && suggestions.length > 0 && (
            <div className="py-1">
              {suggestions.map((location) => {
                const icon = getLocationIcon(location.type);
                
                return (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      {formatLocationDisplay(location)}
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