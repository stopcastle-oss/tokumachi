'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

interface SelectedPlace {
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  currentCity: string | null;
  isDenied: boolean;
  onSave: (city: string, lat?: number, lng?: number) => void;
  onRequestGeo: () => void;
  onClose: () => void;
}

export function LocationPicker({ currentCity, isDenied, onSave, onRequestGeo, onClose }: LocationPickerProps) {
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (value: string) => {
    if (value.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setShowDropdown(true);
    } catch {
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelectPrediction = async (pred: PlacePrediction) => {
    setShowDropdown(false);
    setPredictions([]);
    setIsSearching(true);
    setInput(pred.structured_formatting.main_text);
    try {
      const res = await fetch(`/api/places/details?place_id=${pred.place_id}`);
      const data: SelectedPlace = await res.json();
      onSave(data.name, data.lat, data.lng);
    } catch {
      onSave(pred.structured_formatting.main_text);
    } finally {
      setIsSearching(false);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface-container rounded-t-3xl z-50 px-5 pt-5 pb-8 shadow-2xl">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        <h3 className="text-lg font-bold text-on-background mb-1">場所を設定</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          住所・地名を検索して選択してください
        </p>

        {/* Search input */}
        <div className="relative mb-2">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="例：渋谷区、新宿区、大阪市..."
            className="w-full bg-surface-container-high border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-on-background placeholder:text-on-surface-variant/50 outline-none focus:border-primary/60 transition-colors text-base"
          />
          {isSearching ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : input ? (
            <button
              onClick={() => { setInput(''); setPredictions([]); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">close</span>
            </button>
          ) : null}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="mb-4 bg-surface-container-high border border-white/10 rounded-2xl overflow-hidden">
            {predictions.slice(0, 5).map((pred, i) => (
              <button
                key={pred.place_id}
                onClick={() => handleSelectPrediction(pred)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors ${i > 0 ? 'border-t border-white/5' : ''}`}
              >
                <span
                  className="material-symbols-outlined text-primary text-[18px] shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-background truncate">
                    {pred.structured_formatting.main_text}
                  </p>
                  {pred.structured_formatting.secondary_text && (
                    <p className="text-xs text-on-surface-variant truncate">
                      {pred.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Current location button */}
        <button
          onClick={() => { onRequestGeo(); onClose(); }}
          className="w-full flex items-center gap-3 bg-surface-container-high border border-white/10 rounded-2xl px-4 py-3 active:scale-[0.98] active:bg-surface-container-highest transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              my_location
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-on-background">現在地を使用</p>
            {isDenied ? (
              <p className="text-xs text-error">位置情報の許可が必要です</p>
            ) : (
              <p className="text-xs text-on-surface-variant">GPSで自動取得</p>
            )}
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] ml-auto">
            chevron_right
          </span>
        </button>

        {currentCity && (
          <p className="text-xs text-on-surface-variant text-center mt-4">
            現在の設定：<span className="text-primary font-semibold">{currentCity}</span>
          </p>
        )}
      </div>
    </>
  );
}
