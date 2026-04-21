'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function RegisterPage() {
  useProtectedRoute();
  const router = useRouter();
  const [step, setStep] = useState<Step>('store');

  // Store step
  const [storeQuery, setStoreQuery] = useState('');
  const [storeSuggestions, setStoreSuggestions] = useState<StoreResult[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreResult | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);

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
    const initMaps = () => {
      if (window.google?.maps?.places && mapDivRef.current) {
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        placesRef.current = new google.maps.places.PlacesService(mapDivRef.current);
      }
    };
    if (window.google?.maps?.places) {
      initMaps();
    } else {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
        script.onload = initMaps;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', initMaps);
      }
    }
  }, []);

  // Store autocomplete
  useEffect(() => {
    if (!storeQuery.trim() || !autocompleteRef.current) { setStoreSuggestions([]); return; }
    autocompleteRef.current.getPlacePredictions(
      { input: storeQuery, types: ['supermarket', 'grocery_or_supermarket', 'convenience_store'] },
      (predictions) => setStoreSuggestions(
        (predictions || []).map(p => ({ place_id: p.place_id, name: p.structured_formatting.main_text, address: p.structured_formatting.secondary_text || '', lat: 0, lng: 0 }))
      )
    );
  }, [storeQuery]);

  const selectStore = (suggestion: StoreResult) => {
    if (!placesRef.current) return;
    placesRef.current.getDetails({ placeId: suggestion.place_id, fields: ['geometry', 'name', 'formatted_address'] }, (place) => {
      if (!place?.geometry?.location) return;
      setSelectedStore({
        place_id: suggestion.place_id,
        name: place.name || suggestion.name,
        address: place.formatted_address || suggestion.address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
      setStoreSuggestions([]);
      setStoreQuery(place.name || suggestion.name);
    });
  };

  // Item search
  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(itemQuery)}`);
      const data = await res.json();
      setItems(data.items || []);
    };
    fetchItems();
  }, [itemQuery]);

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
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div ref={mapDivRef} className="hidden" />

      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center mb-8 gap-2">
          {['スーパー', '品目', '価格'].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i < stepIndex ? 'bg-blue-500 text-white' : i === stepIndex ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i === stepIndex ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-px mx-3 ${i < stepIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Store */}
      {step === 'store' && (
        <div>
          <h2 className="text-xl font-bold mb-1">スーパーを選択</h2>
          <p className="text-gray-500 text-sm mb-4">価格を登録するスーパーを検索してください</p>
          <input
            type="text"
            value={storeQuery}
            onChange={e => { setStoreQuery(e.target.value); setSelectedStore(null); }}
            placeholder="例：イオン、西友、ドンキ..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {storeSuggestions.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {storeSuggestions.map(s => (
                <button key={s.place_id} onClick={() => selectStore(s)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{s.address}</p>
                </button>
              ))}
            </div>
          )}
          <button
            disabled={!selectedStore}
            onClick={() => setStep('item')}
            className="mt-6 w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            次へ →
          </button>
        </div>
      )}

      {/* Step 2: Item */}
      {step === 'item' && (
        <div>
          <h2 className="text-xl font-bold mb-1">品目を選択</h2>
          <p className="text-gray-500 text-sm mb-4">{selectedStore?.name} の価格を登録する品目</p>
          <input
            type="text"
            value={itemQuery}
            onChange={e => setItemQuery(e.target.value)}
            placeholder="例：卵、牛乳、キャベツ..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-3"
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {items.map(item => (
              <button key={item.id} onClick={() => { setSelectedItem(item); setStep('price'); }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedItem?.id === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <span className="font-medium text-sm">{item.name_ja}</span>
                <span className="ml-2 text-xs text-gray-400">{item.category} · {item.unit}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('store')} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
            ← 戻る
          </button>
        </div>
      )}

      {/* Step 3: Price */}
      {step === 'price' && (
        <div>
          <h2 className="text-xl font-bold mb-1">価格を入力</h2>
          <p className="text-gray-500 text-sm mb-4">
            {selectedStore?.name} の {selectedItem?.name_ja} ({selectedItem?.unit})
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">¥</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-4 text-2xl font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <button
            disabled={!price || Number(price) <= 0 || submitting}
            onClick={handleSubmit}
            className="mt-6 w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-lg transition-colors"
          >
            {submitting ? '登録中...' : '登録する'}
          </button>
          <button onClick={() => setStep('item')} className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600">
            ← 戻る
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">登録完了！</h2>
          <p className="text-gray-500 mb-4">
            {selectedStore?.name} の {selectedItem?.name_ja} ¥{price} を登録しました
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-5 py-2 mb-8">
            <span className="text-yellow-500 font-bold text-lg">+{result.points_awarded}pt</span>
            <span className="text-yellow-600 text-sm">獲得！</span>
          </div>
          <div className="space-y-3">
            <button onClick={() => { setStep('store'); setSelectedStore(null); setSelectedItem(null); setPrice(''); setStoreQuery(''); setItemQuery(''); setResult(null); }}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg">
              続けて登録する
            </button>
            <button onClick={() => router.push('/')} className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-lg">
              ホームへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
