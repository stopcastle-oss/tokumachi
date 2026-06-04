'use client';

import { useState, useEffect } from 'react';

interface StoreResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_meters?: number;
}

interface PriceEntry {
  id: string;
  price: number;
  created_at: string;
  items: { name_ja: string } | null;
}

interface StoreDetail {
  entry_count: number;
  entries: PriceEntry[];
  phone_number: string | null;
}

interface StoreDetailSheetProps {
  store: StoreResult;
  initialTab: 'comment' | 'info';
  onClose: () => void;
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function StoreDetailSheet({ store, initialTab, onClose }: StoreDetailSheetProps) {
  const [tab, setTab] = useState<'comment' | 'info'>(initialTab);
  const [detail, setDetail] = useState<StoreDetail | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab !== 'info') return;
    fetch(`/api/stores/${store.place_id}`)
      .then(r => r.json())
      .then(d => setDetail({ entry_count: d.entry_count, entries: d.entries || [], phone_number: d.store?.phone_number ?? null }))
      .catch(() => {});
  }, [tab, store.place_id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[75dvh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-on-background truncate">{store.name}</h2>
            {store.distance_meters !== undefined && (
              <p className="text-xs text-on-surface-variant/60 mt-0.5">{formatDistance(store.distance_meters)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-white/5">
          {(['comment', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors relative ${
                tab === t ? 'text-primary' : 'text-on-surface-variant/50'
              }`}
            >
              {t === 'comment' ? 'コメント' : '店舗情報'}
              {tab === t && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'comment' && (
            <div className="p-4">
              <div className="mb-4">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="このお店についてコメントを書いてください..."
                  rows={3}
                  className="w-full bg-surface-container border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 resize-none transition-colors"
                />
                <button
                  disabled={!comment.trim()}
                  className="mt-2 w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  投稿する
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-[44px] mb-2">chat_bubble</span>
                <p className="text-sm text-on-surface-variant/50">まだコメントがありません</p>
                <p className="text-xs text-on-surface-variant/30 mt-1">最初のコメントを書いてみましょう</p>
              </div>
            </div>
          )}

          {tab === 'info' && (
            <div className="p-4 space-y-3 pb-8">
              {/* 기본 정보 */}
              <div className="bg-surface-container rounded-2xl p-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
                  <div>
                    <p className="text-xs text-on-surface-variant/60 mb-0.5">店舗名</p>
                    <p className="text-sm font-bold text-on-background">{store.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <div>
                    <p className="text-xs text-on-surface-variant/60 mb-0.5">住所</p>
                    <p className="text-sm text-on-background leading-relaxed">{store.address}</p>
                  </div>
                </div>
                {store.distance_meters !== undefined && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">near_me</span>
                    <div>
                      <p className="text-xs text-on-surface-variant/60 mb-0.5">現在地からの距離</p>
                      <p className="text-sm font-bold text-on-background">{formatDistance(store.distance_meters)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">call</span>
                  <div>
                    <p className="text-xs text-on-surface-variant/60 mb-0.5">電話番号</p>
                    {detail?.phone_number ? (
                      <a href={`tel:${detail.phone_number}`} className="text-sm font-bold text-primary">
                        {detail.phone_number}
                      </a>
                    ) : (
                      <p className="text-sm text-on-surface-variant/40">
                        {detail === null ? '読み込み中...' : '情報なし'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 가격 정보 */}
              <div className="bg-surface-container rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                  <p className="text-sm font-bold text-on-background">
                    登録済み価格情報
                    {detail && <span className="text-primary ml-1">{detail.entry_count}件</span>}
                  </p>
                </div>

                {!detail ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : detail.entries.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant/20 text-[36px] mb-1">receipt_long</span>
                    <p className="text-xs text-on-surface-variant/50">価格情報はまだありません</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {detail.entries.map((entry, i) => (
                      <div key={entry.id} className={`flex items-center justify-between py-2.5 ${i < detail.entries.length - 1 ? 'border-b border-white/5' : ''}`}>
                        <p className="text-sm text-on-background">{entry.items?.name_ja ?? '—'}</p>
                        <p className="text-sm font-bold text-primary">¥{entry.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
