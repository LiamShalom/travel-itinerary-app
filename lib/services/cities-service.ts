import Papa from 'papaparse';

export interface Country {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  capital: string;
  latitude: number;
  longitude: number;
  emoji: string;
  region: string;
  population: number;
}

export interface City {
  id: number;
  name: string;
  country_id: number;
  country_name: string;
  state_name: string;
  latitude: number;
  longitude: number;
  native: string;
}

export interface SearchResult {
  id: string;
  name: string;
  display_name: string;
  type: 'country' | 'city';
  coordinates: {
    lat: number;
    lng: number;
  };
  context: {
    country?: string;
    city?: string;
    state?: string;
    region?: string;
    emoji?: string;
  };
}

class CitiesService {
  private countries: Country[] = [];
  private cities: City[] = [];
  private loaded = false;

  async loadData() {
    if (this.loaded) return;

    try {
      // Load countries
      const countriesResponse = await fetch('/countries.csv');
      const countriesText = await countriesResponse.text();
      const countriesData = Papa.parse(countriesText, { header: true }).data as any[];
      
      this.countries = countriesData
        .filter(row => row.id && row.name)
        .map(row => ({
          id: parseInt(row.id),
          name: row.name,
          iso3: row.iso3,
          iso2: row.iso2,
          capital: row.capital,
          latitude: parseFloat(row.latitude) || 0,
          longitude: parseFloat(row.longitude) || 0,
          emoji: row.emoji,
          region: row.region,
          population: parseInt(row.population) || 0
        }));

      // Load cities
      const citiesResponse = await fetch('/cities.csv');
      const citiesText = await citiesResponse.text();
      const citiesData = Papa.parse(citiesText, { header: true }).data as any[];
      
      this.cities = citiesData
        .filter(row => row.id && row.name)
        .map(row => ({
          id: parseInt(row.id),
          name: row.name,
          country_id: parseInt(row.country_id),
          country_name: row.country_name,
          state_name: row.state_name,
          latitude: parseFloat(row.latitude) || 0,
          longitude: parseFloat(row.longitude) || 0,
          native: row.native || ''
        }));

      this.loaded = true;
      console.log(`Loaded ${this.countries.length} countries and ${this.cities.length} cities`);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  }

  async searchLocations(query: string, limit: number = 8): Promise<SearchResult[]> {
    await this.loadData();
    
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results: SearchResult[] = [];
    
    // Search countries first
    for (const country of this.countries) {
      if (results.length >= limit) break;
      
      const nameMatch = country.name.toLowerCase().includes(searchTerm);
      const capitalMatch = country.capital?.toLowerCase().includes(searchTerm);
      
      if (nameMatch || capitalMatch) {
        results.push({
          id: `country-${country.id}`,
          name: country.name,
          display_name: country.name,
          type: 'country',
          coordinates: {
            lat: country.latitude,
            lng: country.longitude
          },
          context: {
            country: country.name,
            region: country.region,
            emoji: country.emoji
          }
        });
      }
    }
    
    // Then search cities (only if we haven't reached the limit)
    if (results.length < limit) {
      for (const city of this.cities) {
        if (results.length >= limit) break;
        
        const nameMatch = city.name.toLowerCase().includes(searchTerm);
        const nativeMatch = city.native.toLowerCase().includes(searchTerm);
        
        if (nameMatch || nativeMatch) {
          const country = this.countries.find(c => c.id === city.country_id);
          
          results.push({
            id: `city-${city.id}`,
            name: city.name,
            display_name: `${city.name}, ${city.country_name}`,
            type: 'city',
            coordinates: {
              lat: city.latitude,
              lng: city.longitude
            },
            context: {
              city: city.name,
              state: city.state_name,
              country: city.country_name,
              emoji: country?.emoji
            }
          });
        }
      }
    }
    
    // Sort results: countries first, then cities, with name similarity priority
    results.sort((a, b) => {
      // 1. Countries before cities
      if (a.type === 'country' && b.type === 'city') return -1;
      if (a.type === 'city' && b.type === 'country') return 1;
      
      // 2. Within same type, exact matches first
      const aExact = a.name.toLowerCase() === searchTerm;
      const bExact = b.name.toLowerCase() === searchTerm;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // 3. Then starts with search term
      const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
      const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // 4. Finally alphabetical
      return a.name.localeCompare(b.name);
    });
    
    return results.slice(0, limit);
  }
}

export const citiesService = new CitiesService();
