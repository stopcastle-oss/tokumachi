'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

interface StoreResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_meters?: number;
}

interface ItemResult {
  id: string;
  name_ja: string;
  category: string;
  unit: string;
}

type Step = 'store' | 'item' | 'price' | 'done';

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#383838' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#484848' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2a1a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#333333' }] },
];

export default function RegisterPage() {
  useProtectedRoute();
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<Step>('store');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<StoreResult[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [itemQuery, setItemQuery] = useState('');
  const [items, setItems] = useState<ItemResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemResult | null>(null);

  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ points_awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initMap = useCallback((center: { lat: number; lng: number }) => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
      styles: DARK_MAP_STYLES,
    });
    mapInstanceRef.current = map;
    setMapReady(true);
  }, []);

  const placeUserMarker = useCallback((loc: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      position: loc,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: '#ff5722',
        strokeWeight: 2.5,
      },
      zIndex: 999,
    });
  }, []);

  useEffect(() => {
    const DEFAULT = { lat: 35.6762, lng: 139.6503 };
    const load = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          initMap(loc);
          setTimeout(() => placeUserMarker(loc), 100);
        },
        () => {
          setUserLocation(DEFAULT);
          initMap(DEFAULT);
        },
        { timeout: 8000 }
      );
    };

    if (window.google?.maps) {
      load();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.onload = load;
      document.head.appendChild(script);
    }
  }, [initMap, placeUserMarker]);

  const searchNearbyStores = useCallback(async (location: { lat: number; lng: number }) => {
    // import-nearby: 24시간 캐시 → Google Places는 필요할 때만 호출
    await fetch('/api/stores/import-nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: location.lat, lng: location.lng, radius: 1500 }),
    });
    // DB에서 조회
    const res = await fetch(`/api/stores/nearby?lat=${location.lat}&lng=${location.lng}&radius=1500`);
    if (!res.ok) return;
    const data = await res.json() as { stores: Array<{ id: string; name_ja: string; address: string; latitude: number; longitude: number; distance_meters: number }> };
    setNearbyStores((data.stores || []).map(s => ({
      place_id: s.id,
      name: s.name_ja,
      address: s.address,
      lat: s.latitude,
      lng: s.longitude,
      distance_meters: s.distance_meters,
    })));
  }, []);

  useEffect(() => {
    if (mapReady && userLocation) { void searchNearbyStores(userLocation); }
  }, [mapReady, userLocation, searchNearbyStores]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || nearbyStores.length === 0) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    nearbyStores.forEach(store => {
      const isSelected = selectedStore?.place_id === store.place_id;
      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 11 : 8,
          fillColor: isSelected ? '#ff5722' : '#ff5722',
          fillOpacity: isSelected ? 1 : 0.7,
          strokeColor: '#ffffff',
          strokeWeight: isSelected ? 2.5 : 1.5,
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

  useEffect(() => {
    if (step !== 'item') return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(itemQuery)}`);
      const data = await res.json();
      setItems(data.items || []);
    }, 250);
    return () => clearTimeout(t);
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
  const steps = ['マート', '商品', '価格'];

  // ── Store step ──
  if (step === 'store') {
    return (
      <div className="flex flex-col h-[calc(100dvh-64px)] bg-background relative">
        {/* Step bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                i === stepIndex ? 'bg-primary text-white' : i < stepIndex ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant/40'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  i === stepIndex ? 'bg-white/20' : ''
                }`}>{i + 1}</span>
                {label}
              </div>
              {i < 2 && <div className={`w-4 h-px ${i < stepIndex ? 'bg-primary/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Map 30% */}
        <div className="relative" style={{ height: '30%' }}>
          <div ref={mapRef} className="w-full h-full" />
          {/* Recenter button */}
          {userLocation && (
            <button
              onClick={() => {
                mapInstanceRef.current?.panTo(userLocation);
                mapInstanceRef.current?.setZoom(15);
              }}
              className="absolute bottom-3 right-3 w-9 h-9 bg-surface-container border border-white/10 rounded-xl flex items-center justify-center shadow-lg z-10"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">my_location</span>
            </button>
          )}
          {nearbyStores.length > 0 && !selectedStore && (
            <div className="absolute top-3 left-3 bg-surface-container/90 border border-white/10 rounded-xl px-3 py-1.5 z-10">
              <p className="text-xs text-on-surface-variant font-medium">{nearbyStores.length}件 · タップして選択</p>
            </div>
          )}
        </div>

        {/* Store list 45% */}
        <div className="flex-1 overflow-y-auto border-t border-white/5">
          {nearbyStores.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-on-surface-variant/50">近くのスーパーを検索中...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-surface-container border-b border-white/5 sticky top-0 z-10">
                <p className="text-xs font-bold text-on-surface-variant">近くのスーパー {nearbyStores.length}件</p>
              </div>
              {nearbyStores.map(store => (
                <button
                  key={store.place_id}
                  onClick={() => {
                    setSelectedStore(store);
                    mapInstanceRef.current?.panTo({ lat: store.lat, lng: store.lng });
                  }}
                  className={`w-full flex items-center px-4 py-3.5 border-b border-white/5 text-left transition-colors ${
                    selectedStore?.place_id === store.place_id ? 'bg-primary/10' : 'active:bg-surface-container'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mr-3">
                    <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-background truncate">{store.name}</p>
                    <p className="text-xs text-on-surface-variant/60 truncate mt-0.5">{store.address}</p>
                  </div>
                  <div className="ml-2 flex flex-col items-end shrink-0">
                    {store.distance_meters !== undefined && (
                      <p className="text-xs font-bold text-primary">
                        {store.distance_meters < 1000 ? `${Math.round(store.distance_meters)}m` : `${(store.distance_meters/1000).toFixed(1)}km`}
                      </p>
                    )}
                    {selectedStore?.place_id === store.place_id && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* store list 하단 여백 — fixed CTA 높이만큼 */}
        <div className="h-32" />

        {/* Fixed CTA — BottomNav(약 64px) 위에 표시 */}
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-40">
          {selectedStore ? (
            <button
              onClick={() => setStep('item')}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-900/40 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
              {selectedStore.name} で登録する
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <div className="w-full py-3.5 bg-surface-container rounded-2xl text-sm flex items-center justify-center gap-2 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-[18px]">touch_app</span>
              マートを選択してください
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Item step ──
  if (step === 'item') {
    return (
      <div className="flex flex-col h-[calc(100dvh-64px)] bg-background">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                i === stepIndex ? 'bg-primary text-white' : i < stepIndex ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant/40'
              }`}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold">{i + 1}</span>
                {label}
              </div>
              {i < 2 && <div className={`w-4 h-px ${i < stepIndex ? 'bg-primary/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="shrink-0 px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/60 mb-3">
            <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
            {selectedStore?.name}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
            <input
              type="text"
              value={itemQuery}
              onChange={e => setItemQuery(e.target.value)}
              placeholder="例：卵、牛乳、キャベツ..."
              autoFocus
              className="w-full bg-surface-container border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-base text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setStep('price');
                fetch(`/api/items/${item.id}`, { method: 'POST' }).catch(() => {});
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 mb-2 bg-surface-container border border-white/5 rounded-2xl text-left active:bg-surface-container-high transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-background text-sm">{item.name_ja}</p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{item.category}</p>
              </div>
              <span className="text-xs text-on-surface-variant/50 bg-surface-container-high px-2 py-0.5 rounded-lg shrink-0">{item.unit}</span>
              <span className="material-symbols-outlined text-on-surface-variant/30 text-[18px]">chevron_right</span>
            </button>
          ))}
          {items.length === 0 && itemQuery && (
            <div className="text-center py-10">
              <p className="text-on-surface-variant/50 text-sm">「{itemQuery}」が見つかりません</p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-white/5">
          <button onClick={() => setStep('store')} className="flex items-center gap-1.5 text-sm text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            マートを変更
          </button>
        </div>
      </div>
    );
  }

  // ── Price step ──
  if (step === 'price') {
    return (
      <div className="flex flex-col h-[calc(100dvh-64px)] bg-background">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                i === stepIndex ? 'bg-primary text-white' : i < stepIndex ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant/40'
              }`}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold">{i + 1}</span>
                {label}
              </div>
              {i < 2 && <div className={`w-4 h-px ${i < stepIndex ? 'bg-primary/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 px-5 py-6">
          <div className="bg-surface-container border border-white/5 rounded-2xl px-4 py-3.5 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
              <span className="truncate">{selectedStore?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
              <span>{selectedItem?.name_ja} · {selectedItem?.unit}</span>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant/60 font-medium mb-2">税込み価格</p>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xl">¥</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min="1"
              autoFocus
              className="w-full bg-surface-container border-2 border-white/10 focus:border-primary/60 rounded-2xl pl-10 pr-4 py-5 text-3xl font-extrabold text-on-background focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-error/10 border border-error/20 text-error rounded-2xl text-sm">{error}</div>
          )}

          <button
            disabled={!price || Number(price) <= 0 || submitting}
            onClick={handleSubmit}
            className="w-full py-4 bg-primary text-white text-base font-bold rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/40 active:scale-95 transition-all"
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
            {submitting ? '登録中...' : '登録する'}
          </button>
        </div>

        <div className="shrink-0 px-4 pb-4">
          <button onClick={() => setStep('item')} className="flex items-center gap-1.5 text-sm text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            商品を変更
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-64px)] bg-background px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-2xl shadow-orange-900/50 mb-6">
        <span className="material-symbols-outlined text-white text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
      </div>
      <h2 className="text-2xl font-extrabold text-on-background mb-1">登録完了！</h2>
      <p className="text-sm text-on-surface-variant mb-1">{selectedStore?.name}</p>
      <p className="text-sm text-on-background font-bold mb-6">{selectedItem?.name_ja} ¥{Number(price).toLocaleString()}</p>

      <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-6 py-3 mb-8">
        <span className="material-symbols-outlined text-secondary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        <span className="text-secondary font-extrabold text-xl">+{result?.points_awarded}pt</span>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={() => {
            setStep('store');
            setSelectedStore(null);
            setSelectedItem(null);
            setPrice('');
            setItemQuery('');
            setResult(null);
          }}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-orange-900/40 active:scale-95 transition-transform"
        >
          続けて登録する
        </button>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="w-full py-3.5 bg-surface-container text-on-surface-variant font-bold rounded-2xl border border-white/5"
        >
          ホームへ戻る
        </button>
      </div>
    </div>
  );
}
