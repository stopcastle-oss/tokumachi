'use client';

import { useState, useEffect, useRef } from 'react';

interface LocationPickerProps {
  currentCity: string | null;
  isDenied: boolean;
  onSave: (city: string) => void;
  onRequestGeo: () => void;
  onClose: () => void;
}

export function LocationPicker({ currentCity, isDenied, onSave, onRequestGeo, onClose }: LocationPickerProps) {
  const [input, setInput] = useState(currentCity ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSave(trimmed);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface-container rounded-t-3xl z-50 px-5 pt-5 pb-safe shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        <h3 className="text-lg font-bold text-on-background mb-1">場所を設定</h3>
        <p className="text-sm text-on-surface-variant mb-5">
          地域名を入力するか、現在地を使用してください
        </p>

        {/* Manual input */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            edit_location
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="例：足立区、渋谷区..."
            className="w-full bg-surface-container-high border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-on-background placeholder:text-on-surface-variant/50 outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Use current location button */}
        <button
          onClick={() => { onRequestGeo(); onClose(); }}
          className="w-full flex items-center gap-3 bg-surface-container-high border border-white/10 rounded-2xl px-4 py-3 mb-5 active:bg-surface-container-highest transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              my_location
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-on-background">現在地を使用</p>
            {isDenied && (
              <p className="text-xs text-on-surface-variant">位置情報の許可が必要です</p>
            )}
          </div>
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!input.trim()}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all mb-3"
        >
          保存する
        </button>
      </div>
    </>
  );
}
