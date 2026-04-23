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
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
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
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelectPrediction = async (pred: PlacePrediction) => {
    setInput(pred.description);
    setShowDropdown(false);
    setPredictions([]);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/places/details?place_id=${pred.place_id}`);
      const data: SelectedPlace = await res.json();
      setSelected(data);
      setInput(data.name);
    } catch {
      setSelected({
        name: pred.structured_formatting.main_text,
        formatted_address: pred.description,
        lat: 0,
        lng: 0,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = () => {
    if (selected && selected.lat !== 0) {
      onSave(selected.name, selected.lat, selected.lng);
    } else if (input.trim()) {
      onSave(input.trim());
    }
    onClose();
  };

  const canApply = selected !== null || input.trim().length > 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface-container rounded-t-3xl z-50 px-5 pt-5 pb-8 shadow-2xl">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        <h3 className="text-lg font-bold text-on-background mb-1">場所を設定</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          住所・地名を検索するか、現在地を使用してください
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
            className="w-full bg-surface-container-high border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-sm text-on-background placeholder:text-on-surface-variant/50 outline-none focus:border-primary/60 transition-colors"
          />
          {isSearching ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : input ? (
            <button
              onClick={() => { setInput(''); setSelected(null); setPredictions([]); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">close</span>
            </button>
          ) : null}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="mb-3 bg-surface-container-high border border-white/10 rounded-2xl overflow-hidden">
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

        {/* Selected place chip */}
        {selected && (
          <div className="flex items-center gap-3 mb-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5">
            <span
              className="material-symbols-outlined text-primary text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{selected.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{selected.formatted_address}</p>
            </div>
          </div>
        )}

        {/* Current location button */}
        <button
          onClick={() => { onRequestGeo(); onClose(); }}
          className="w-full flex items-center gap-3 bg-surface-container-high border border-white/10 rounded-2xl px-4 py-3 mb-4 active:scale-[0.98] active:bg-surface-container-highest transition-all"
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

        {/* Current setting hint */}
        {currentCity && !selected && (
          <p className="text-xs text-on-surface-variant text-center mb-3">
            現在の設定：<span className="text-primary font-semibold">{currentCity}</span>
          </p>
        )}

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={!canApply}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all"
        >
          適用する
        </button>
      </div>
    </>
  );
}
