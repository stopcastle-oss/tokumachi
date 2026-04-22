'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'tm_location';

export function useLocation() {
  const { user } = useAuth();
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);

  const saveCity = useCallback(async (cityName: string) => {
    setCity(cityName);
    localStorage.setItem(STORAGE_KEY, cityName);
    if (user) {
      const supabase = createClient();
      await supabase.from('profiles').update({ city: cityName }).eq('id', user.id);
    }
  }, [user]);

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
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (name) await saveCity(name);
        setIsLoading(false);
      },
      () => {
        setIsDenied(true);
        setIsLoading(false);
      },
      { timeout: 8000 }
    );
  }, [reverseGeocode, saveCity]);

  useEffect(() => {
    // 1. localStorage 우선
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCity(stored);
      setIsLoading(false);
      return;
    }
    // 2. 프로필 city
    // (profile은 useAuth에서 오므로 Header에서 처리)
    // 3. Geolocation 요청
    requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { city, isLoading, isDenied, requestLocation, saveCity };
}
