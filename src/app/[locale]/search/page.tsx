'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface Item { id: string; name_ja: string; name_ko: string | null; category: string; unit: string }
interface PriceResult {
  entry_id: string; price: number; like_count: number; created_at: string;
  item_name: string; category: string; unit: string;
  store_name: string; store_address: string; distance_meters: number | null;
}

const EMOJI: Record<string, string> = {
  '野菜':'🥬','果物':'🍎','肉':'🥩','魚':'🐟','乳製品':'🥛','卵':'🥚',
  '飲み物':'🧃','パン':'🍞','冷凍食品':'🧊','お菓子':'🍫','調味料':'🧂','米・穀物':'🌾',
};
const getEmoji = (cat: string) => EMOJI[cat] || '🛒';
const fmtDist = (m: number | null) => m === null ? null : m < 1000 ? `${m}m` : `${(m/1000).toFixed(1)}km`;

export default function SearchPage() {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<Item[]>([]);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords(null), { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    fetch('/api/items/search')
      .then((r) => r.json())
      .then((d) => setTrending((d.items || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setIsTrendingLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams({ q: query.trim() });
      if (coords) { p.set('lat', String(coords.lat)); p.set('lng', String(coords.lng)); }
      fetch(`/api/entries/price-search?${p}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results || []))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }, 350);
  }, [query, coords]);

  const showTrending = !query.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm px-5 pt-4 pb-3 border-b border-white/5">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[22px] pointer-events-none">search</span>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="商品名で検索..." autoFocus
            className="w-full bg-surface-container border border-white/10 rounded-2xl pl-11 pr-10 py-3.5 text-on-background placeholder:text-on-surface-variant/40 font-medium text-base focus:outline-none focus:border-primary/50 focus:bg-surface-container-high transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
        {coords && !showTrending && (
          <p className="text-[11px] text-on-surface-variant/40 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            現在地から5km以内
          </p>
        )}
      </div>

      <div className="px-5 pt-5">
        {showTrending && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px] bg-primary/10 p-1 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <h3 className="font-bold text-on-background">検索トレンド</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest ml-auto">Top 5</span>
            </div>
            <div className="space-y-2.5">
              {isTrendingLoading
                ? [1,2,3,4,5].map((i) => <div key={i} className="h-14 rounded-2xl bg-surface-container animate-pulse" />)
                : trending.map((item, idx) => (
                  <button key={item.id} onClick={() => setQuery(item.name_ja)}
                    className="w-full flex items-center gap-4 bg-surface-container border border-white/5 rounded-2xl px-4 py-3 active:bg-surface-container-high transition-colors text-left">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                      idx === 0 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md'
                      : idx === 1 ? 'bg-primary/15 text-primary'
                      : idx === 2 ? 'bg-white/8 text-orange-300'
                      : 'bg-white/5 text-on-surface-variant/60'}`}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-background text-sm">{item.name_ja}</p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">{item.category}</p>
                    </div>
                    <span className="text-2xl shrink-0">{getEmoji(item.category)}</span>
                    <span className="material-symbols-outlined text-on-surface-variant/30 text-[18px] shrink-0">north_west</span>
                  </button>
                ))}
            </div>
          </section>
        )}

        {!showTrending && (
          <section>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />)}</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🔍</span>
                <p className="text-on-surface-variant font-medium">「{query}」の価格情報がありません</p>
                <p className="text-on-surface-variant/50 text-sm mt-1 mb-6">近くのマーケットにまだ登録されていないようです</p>
                <Link href={`/${locale}/map`} className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-orange-900/40">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                  マップから登録する
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant/60 mb-3 font-medium">{results.length}件 · 最安値順</p>
                <div className="space-y-2.5">
                  {results.map((r, idx) => (
                    <Link key={r.entry_id} href={`/${locale}/entries/${r.entry_id}`}
                      className="flex items-center gap-3 bg-surface-container border border-white/5 rounded-2xl px-4 py-3.5 active:bg-surface-container-high transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        idx === 0 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                        : idx === 1 ? 'bg-white/10 text-on-surface-variant'
                        : 'bg-white/5 text-on-surface-variant/50'}`}>{idx + 1}</div>
                      <span className="text-xl shrink-0">{getEmoji(r.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-background text-sm truncate">{r.item_name}</p>
                        <p className="text-xs text-on-surface-variant/70 truncate mt-0.5">{r.store_name}</p>
                        {r.distance_meters !== null && <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{fmtDist(r.distance_meters)}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-extrabold text-lg ${idx === 0 ? 'text-primary' : 'text-on-background'}`}>¥{r.price.toLocaleString()}</p>
                        <p className="text-[11px] text-on-surface-variant/40">{r.unit}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
