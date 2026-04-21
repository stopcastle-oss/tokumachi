'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

interface StoreResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface ItemResult {
  id: string;
  name_ja: string;
  category: string;
  unit: string;
}

type Step = 'store' | 'item' | 'price' | 'done';

// Custom supermarket marker SVG (cart icon, blue pin)
const STORE_MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#3B82F6" stroke="white" stroke-width="1.5"/>
  <text x="18" y="24" text-anchor="middle" font-size="16" fill="white">🛒</text>
</svg>`;

const STORE_MARKER_SELECTED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52">
  <path d="M21 0C9.4 0 0 9.4 0 21c0 15.75 21 31 21 31s21-15.25 21-31C42 9.4 32.6 0 21 0z" fill="#EF4444" stroke="white" stroke-width="2"/>
  <text x="21" y="28" text-anchor="middle" font-size="18" fill="white">🛒</text>
</svg>`;

const svgToUrl = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export default function RegisterPage() {
  useProtectedRoute();
  const router = useRouter();
  const [step, setStep] = useState<Step>('store');

  // Map
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<StoreResult[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Item step
  const [itemQuery, setItemQuery] = useState('');
  const [items, setItems] = useState<ItemResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemResult | null>(null);

  // Price step
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ points_awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Init Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Default: Tokyo
      const defaultCenter = { lat: 35.6762, lng: 139.6503 };

      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // Get user location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          map.setCenter(loc);
          map.setZoom(15);

          // User location dot
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new google.maps.Marker({
            position: loc,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            },
            zIndex: 999,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err.code, err.message);
          setLocationError(true);
          setUserLocation(defaultCenter);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    if (window.google?.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // Search nearby supermarkets
  const searchNearbyStores = useCallback((location: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    const service = new google.maps.places.PlacesService(mapInstanceRef.current);
    service.nearbySearch(
      {
        location,
        radius: 1500,
        type: 'supermarket',
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;

        const stores: StoreResult[] = results.slice(0, 20).map(p => ({
          place_id: p.place_id!,
          name: p.name!,
          address: p.vicinity || '',
          lat: p.geometry!.location!.lat(),
          lng: p.geometry!.location!.lng(),
        }));

        setNearbyStores(stores);
      }
    );
  }, []);

  useEffect(() => {
    if (mapReady && userLocation) {
      searchNearbyStores(userLocation);
    }
  }, [mapReady, userLocation, searchNearbyStores]);

  // Place markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || nearbyStores.length === 0) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    nearbyStores.forEach(store => {
      const isSelected = selectedStore?.place_id === store.place_id;
      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          url: svgToUrl(isSelected ? STORE_MARKER_SELECTED_SVG : STORE_MARKER_SVG),
          scaledSize: new google.maps.Size(isSelected ? 42 : 36, isSelected ? 52 : 44),
          anchor: new google.maps.Point(isSelected ? 21 : 18, isSelected ? 52 : 44),
        },
        zIndex: isSelected ? 100 : 1,
      });

      marker.addListener('click', () => {
        setSelectedStore(store);
        mapInstanceRef.current?.panTo({ lat: store.lat, lng: store.lng });
      });

      markersRef.current.push(marker);
    });
  }, [nearbyStores, selectedStore]);

  // Item search
  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(itemQuery)}`);
      const data = await res.json();
      setItems(data.items || []);
    };
    if (step === 'item') fetchItems();
  }, [itemQuery, step]);

  const handleSubmit = async () => {
    if (!selectedStore || !selectedItem || !price) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore.place_id,
          store_name: selectedStore.name,
          store_address: selectedStore.address,
          store_lat: selectedStore.lat,
          store_lng: selectedStore.lng,
          item_id: selectedItem.id,
          price: Number(price),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResult({ points_awarded: data.points_awarded });
      setStep('done');
    } catch {
      setError('登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = { store: 0, item: 1, price: 2, done: 3 }[step];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white shrink-0">
          {[{ label: 'スーパー', icon: '🏪' }, { label: '品目', icon: '🛍️' }, { label: '価格', icon: '💴' }].map(({ label, icon }, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${i === stepIndex ? 'bg-blue-500 text-white' : i < stepIndex ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
              {i < 2 && <div className={`w-6 h-px mx-1 ${i < stepIndex ? 'bg-blue-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Map with nearby stores */}
      {step === 'store' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Map */}
          <div className="relative flex-1">
            <div ref={mapRef} className="w-full h-full" />
            {locationError && (
              <div className="absolute top-3 left-3 right-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm z-10">
                <span className="text-orange-500">📍</span>
                <p className="text-sm text-orange-700 flex-1">位置情報を取得できませんでした。東京を表示中。</p>
                <button
                  onClick={() => {
                    setLocationError(false);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setUserLocation(loc);
                        mapInstanceRef.current?.setCenter(loc);
                        mapInstanceRef.current?.setZoom(15);
                      },
                      () => setLocationError(true),
                      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                  }}
                  className="text-xs text-orange-600 font-medium underline shrink-0"
                >
                  再試行
                </button>
              </div>
            )}
            {/* Current location button */}
            <button
              onClick={() => {
                setLocationError(false);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    mapInstanceRef.current?.setCenter(loc);
                    mapInstanceRef.current?.setZoom(15);
                    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
                    userMarkerRef.current = new google.maps.Marker({
                      position: loc,
                      map: mapInstanceRef.current!,
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#3B82F6',
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                      },
                      zIndex: 999,
                    });
                  },
                  (err) => {
                    console.warn('Geolocation retry error:', err.code);
                    setLocationError(true);
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              }}
              className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                <circle cx="12" cy="12" r="8" strokeDasharray="2 2"/>
              </svg>
            </button>
          </div>

          {/* Bottom sheet */}
          <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0 shadow-lg">
            {selectedStore ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">🛒</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{selectedStore.name}</p>
                    <p className="text-sm text-gray-500 truncate">{selectedStore.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep('item')}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
                >
                  このスーパーで登録する →
                </button>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-gray-500 text-sm">
                  {nearbyStores.length > 0
                    ? `${nearbyStores.length}件のスーパーが見つかりました。マーカーをタップして選択`
                    : '位置情報を取得中...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Item */}
      {step === 'item' && (
        <div className="flex flex-col flex-1 overflow-hidden px-4 py-4 bg-white">
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-medium text-gray-900">{selectedStore?.name}</span> で登録する品目を選択
          </p>
          <input
            type="text"
            value={itemQuery}
            onChange={e => setItemQuery(e.target.value)}
            placeholder="例：卵、牛乳、キャベツ..."
            autoFocus
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-3"
          />
          <div className="flex-1 overflow-y-auto space-y-1">
            {items.map(item => (
              <button key={item.id}
                onClick={() => { setSelectedItem(item); setStep('price'); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <span className="font-medium text-sm">{item.name_ja}</span>
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.unit}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('store')} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
            ← 戻る
          </button>
        </div>
      )}

      {/* Step 3: Price */}
      {step === 'price' && (
        <div className="flex flex-col px-4 py-6 bg-white flex-1">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>🏪</span><span>{selectedStore?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>🛍️</span><span>{selectedItem?.name_ja} ({selectedItem?.unit})</span>
            </div>
          </div>

          <label className="text-sm font-medium text-gray-700 mb-2">税込み価格を入力</label>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-bold">¥</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min="1"
              autoFocus
              className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-5 text-3xl font-bold focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <button
            disabled={!price || Number(price) <= 0 || submitting}
            onClick={handleSubmit}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-lg font-bold rounded-xl transition-colors"
          >
            {submitting ? '登録中...' : '登録する 🎉'}
          </button>
          <button onClick={() => setStep('item')} className="mt-3 text-sm text-gray-400 hover:text-gray-600 text-center w-full">
            ← 戻る
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <div className="text-7xl mb-5 animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">登録完了！</h2>
          <p className="text-gray-500 mb-1">{selectedStore?.name}</p>
          <p className="text-gray-700 font-medium mb-6">{selectedItem?.name_ja} ¥{Number(price).toLocaleString()}</p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-6 py-3 mb-8 shadow-sm">
            <span className="text-2xl">⭐</span>
            <span className="text-yellow-600 font-bold text-xl">+{result.points_awarded}pt</span>
            <span className="text-yellow-500 text-sm">獲得！</span>
          </div>
          <div className="w-full space-y-3">
            <button
              onClick={() => { setStep('store'); setSelectedStore(null); setSelectedItem(null); setPrice(''); setItemQuery(''); setResult(null); }}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl"
            >
              続けて登録する
            </button>
            <button onClick={() => router.push('/')}
              className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-xl">
              ホームへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
