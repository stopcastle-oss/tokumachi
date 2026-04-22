'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface Item {
  id: string;
  name_ja: string;
  name_ko: string | null;
  category: string;
  unit: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  '野菜': '🥬', '果物': '🍎', '肉': '🥩', '魚': '🐟',
  '乳製品': '🥛', '卵': '🥚', '飲み物': '🧃', 'パン': '🍞',
  '冷凍食品': '🧊', 'お菓子': '🍫', '調味料': '🧂', '米・穀物': '🌾',
};

function getCategoryEmoji(category: string) {
  return CATEGORY_EMOJI[category] || '🛒';
}

export default function SearchPage() {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [trending, setTrending] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending on mount
  useEffect(() => {
    fetch('/api/items/search')
      .then((r) => r.json())
      .then((data) => setTrending((data.items || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setIsTrendingLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/items/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => setItems(data.items || []))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }, 300);
  }, [query]);

  const showTrending = !query.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm px-5 pt-4 pb-3 border-b border-white/5">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[22px] pointer-events-none">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="商品名で検索..."
            autoFocus
            className="w-full bg-surface-container border border-white/10 rounded-2xl pl-11 pr-10 py-3.5 text-on-background placeholder:text-on-surface-variant/40 font-medium text-sm focus:outline-none focus:border-primary/50 focus:bg-surface-container-high transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Trending */}
        {showTrending && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-primary text-[20px] bg-primary/10 p-1 rounded-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                trending_up
              </span>
              <h3 className="font-bold text-on-background">検索トレンド</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest ml-auto">
                Top 5
              </span>
            </div>

            <div className="space-y-2.5">
              {isTrendingLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-surface-container animate-pulse" />
                ))
                : trending.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setQuery(item.name_ja)}
                    className="w-full flex items-center gap-4 bg-surface-container border border-white/5 rounded-2xl px-4 py-3 active:bg-surface-container-high transition-colors text-left"
                  >
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                      index === 0
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md'
                        : index === 1
                        ? 'bg-primary/15 text-primary'
                        : index === 2
                        ? 'bg-white/8 text-orange-300'
                        : 'bg-white/5 text-on-surface-variant/60'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-background text-sm">{item.name_ja}</p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">{item.category}</p>
                    </div>

                    {/* Emoji */}
                    <span className="text-2xl shrink-0">{getCategoryEmoji(item.category)}</span>

                    <span className="material-symbols-outlined text-on-surface-variant/30 text-[18px] shrink-0">
                      north_west
                    </span>
                  </button>
                ))
              }
            </div>
          </section>
        )}

        {/* Search Results */}
        {!showTrending && (
          <section>
            {isLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🔍</span>
                <p className="text-on-surface-variant font-medium">
                  「{query}」の検索結果がありません
                </p>
                <p className="text-on-surface-variant/50 text-sm mt-1">
                  別のキーワードで試してみてください
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant/60 mb-3 font-medium">
                  {items.length}件の結果
                </p>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}/register?item_id=${item.id}`}
                      className="flex items-center gap-4 bg-surface-container border border-white/5 rounded-2xl px-4 py-3.5 active:bg-surface-container-high transition-colors"
                    >
                      <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">
                        {getCategoryEmoji(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-background text-sm">{item.name_ja}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-0.5">
                          {item.category} · {item.unit}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-[20px]">
                        chevron_right
                      </span>
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
