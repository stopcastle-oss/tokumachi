'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'tm_location_v2';

interface StoredLocation {
  city: string;
  lat?: number;
  lng?: number;
}

export function useLocation() {
  const { user } = useAuth();
  const [city, setCity] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);

  const saveLocation = useCallback(async (cityName: string, lat?: number, lng?: number) => {
    setCity(cityName);
    if (lat !== undefined && lng !== undefined) {
      setCoords({ lat, lng });
    }
    const stored: StoredLocation = { city: cityName, lat, lng };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    if (user) {
      const supabase = createClient();
      await supabase.from('profiles').update({ city: cityName }).eq('id', user.id);
    }
  }, [user]);

  // Alias for backward compat
  const saveCity = useCallback((cityName: string) => saveLocation(cityName), [saveLocation]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ja&result_type=sublocality&key=${key}`
      );
      const data = await res.json();
      const components = data.results?.[0]?.address_components ?? [];
      return (
        components.find((c: { types: string[]; long_name: string }) =>
          c.types.includes('sublocality_level_1')
        )?.long_name ??
        components.find((c: { types: string[]; long_name: string }) =>
          c.types.includes('locality')
        )?.long_name ??
        null
      );
    } catch {
      return null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    setIsLoading(true);
    setIsDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        if (name) await saveLocation(name, lat, lng);
        setCoords({ lat, lng });
        setIsLoading(false);
      },
      () => {
        setIsDenied(true);
        setIsLoading(false);
      },
      { timeout: 8000 }
    );
  }, [reverseGeocode, saveLocation]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: StoredLocation = JSON.parse(raw);
        setCity(parsed.city);
        if (parsed.lat !== undefined && parsed.lng !== undefined) {
          setCoords({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch {
        setCity(raw);
      }
      setIsLoading(false);
      return;
    }
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { city, coords, isLoading, isDenied, requestLocation, saveCity, saveLocation };
}
