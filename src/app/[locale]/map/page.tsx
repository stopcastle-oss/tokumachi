'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import StorePopup from '@/components/map/StorePopup';
import { useLocation } from '@/hooks/useLocation';
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

function formatDistance(meters: number) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)}km`
    : `${Math.round(meters)}m`;
}

export default function MapPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { coords: savedCoords, isLoading: locationLoading } = useLocation();
  const locationInitialized = useRef(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreWithDistance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState<number>(1000);

  const fetchStores = useCallback(async (lat: number, lng: number, r: number) => {
    setIsLoading(true);
    try {
      // Google Places에서 주변 마트를 DB에 upsert한 후 조회
      await fetch('/api/stores/import-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius: r }),
      });

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
    if (locationLoading) return;
    if (locationInitialized.current) return;
    locationInitialized.current = true;

    if (savedCoords) {
      setCenter(savedCoords);
      setSearchCenter(savedCoords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setSearchCenter(loc);
      },
      () => {
        setSearchCenter(DEFAULT_CENTER);
      }
    );
  }, [locationLoading, savedCoords]);

  useEffect(() => {
    if (!searchCenter) return;
    fetchStores(searchCenter.lat, searchCenter.lng, radius);
  }, [searchCenter, radius, fetchStores]);

  const handleMapClick = useCallback((location: { lat: number; lng: number }) => {
    setSearchCenter(location);
    setSelectedStore(null);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Map section */}
      <div className="relative" style={{ height: '55%' }}>
        {/* Radius buttons */}
        <div className="absolute top-3 left-4 right-4 z-10 flex gap-2 justify-center">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-colors ${
                radius === r
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        <StoreMap
          stores={stores}
          center={center}
          searchCenter={searchCenter}
          onStoreSelect={setSelectedStore}
          onMapClick={handleMapClick}
        />

        {isLoading && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full px-4 py-2 shadow text-sm text-gray-600">
              {t('common.loading')}
            </div>
          </div>
        )}

        {selectedStore && (
          <StorePopup
            store={selectedStore}
            onClose={() => setSelectedStore(null)}
          />
        )}
      </div>

      {/* Store list */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 dark:text-gray-500 text-sm">読み込み中...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center">この周辺にスーパーが見つかりませんでした</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                近くのスーパー（{stores.length}件）
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">地図をタップして場所を変更</p>
            </div>
            {stores.map(store => {
              const isSelected = selectedStore?.id === store.id;
              return (
                <div
                  key={store.id}
                  className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedStore(isSelected ? null : store)}
                    className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                      !isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{store.name_ja}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{store.address}</p>
                    </div>
                    <div className="ml-3 flex flex-col items-end shrink-0">
                      <p className="text-xs font-bold text-primary">{formatDistance(store.distance_meters)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {store.entry_count > 0 ? `${store.entry_count}件の情報` : '情報なし'}
                      </p>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="flex justify-around items-center px-4 py-3 border-t border-blue-100 dark:border-blue-800/40">
                      <Link
                        href={`/${locale}/register?store_id=${store.id}`}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-11 h-11 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-active:scale-95 transition-transform">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">상품등록</span>
                      </Link>

                      <button className="flex flex-col items-center gap-1.5 group">
                        <div className="w-11 h-11 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center group-active:scale-95 transition-transform">
                          <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.84L3 20l1.09-3.27C3.4 15.56 3 13.82 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">코멘트</span>
                      </button>

                      <button className="flex flex-col items-center gap-1.5 group">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-active:scale-95 transition-transform">
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">마트정보</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
