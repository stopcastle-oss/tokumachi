'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import StorePopup from '@/components/map/StorePopup';
import EmptyState from '@/components/empty/EmptyState';
import { StoreWithDistance } from '@/types';

const StoreMap = dynamic(() => import('@/components/map/StoreMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <p className="text-gray-500 text-sm">地図を読み込み中...</p>
    </div>
  ),
});

const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };
const RADIUS_OPTIONS = [500, 1000, 3000, 5000] as const;

export default function MapPage() {
  const t = useTranslations();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreWithDistance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState<number>(1000);

  const fetchStores = useCallback(async (lat: number, lng: number, r: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setStores(data.stores || []);
    } catch (err) {
      console.error('Stores fetch error:', err);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setCurrentLocation(loc);
      },
      () => {
        setCurrentLocation(DEFAULT_CENTER);
      }
    );
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    fetchStores(currentLocation.lat, currentLocation.lng, radius);
  }, [currentLocation, radius, fetchStores]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 justify-center">
        {RADIUS_OPTIONS.map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-colors ${
              radius === r
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {r >= 1000 ? `${r / 1000}km` : `${r}m`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-4">
          <EmptyState type="no_data_store" />
        </div>
      ) : (
        <StoreMap
          stores={stores}
          center={center}
          onStoreSelect={setSelectedStore}
        />
      )}

      {selectedStore && (
        <StorePopup
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}
    </div>
  );
}
