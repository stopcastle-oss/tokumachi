'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { EntryDetail, PriceHistory } from '@/types';

const CATEGORY_EMOJI: Record<string, string> = {
  '野菜': '🥬', '果物': '🍎', '肉': '🥩', '魚': '🐟',
  '乳製品': '🥛', '卵': '🥚', '飲み物': '🧃', 'パン': '🍞',
  '冷凍食品': '🧊', 'お菓子': '🍫', '調味料': '🧂', '米・穀物': '🌾',
};

function getEmoji(name: string, category: string) {
  if (CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category];
  if (name.includes('牛乳') || name.includes('乳')) return '🥛';
  if (name.includes('卵') || name.includes('たまご')) return '🥚';
  if (name.includes('りんご') || name.includes('苺') || name.includes('いちご')) return '🍎';
  if (name.includes('キャベツ') || name.includes('レタス')) return '🥬';
  if (name.includes('豚') || name.includes('鶏') || name.includes('牛')) return '🥩';
  return '🛒';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function TrustBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-on-surface-variant/50">評価なし</span>;
  const color = score >= 80 ? 'text-tertiary bg-tertiary/10' : score >= 50 ? 'text-secondary bg-secondary/10' : 'text-error bg-error/10';
  const label = score >= 80 ? '高信頼' : score >= 50 ? '普通' : '要確認';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {score >= 80 ? 'verified' : score >= 50 ? 'help' : 'warning'}
      </span>
      {label} {score}%
    </span>
  );
}

export default function EntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user } = useAuth();
  const entryId = params.entryId as string;

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Price edit state
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  // Verify state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/entries/${entryId}`);
      if (!res.ok) { router.back(); return; }
      const data = await res.json();
      setEntry(data.entry);
      setHistory(data.price_history || []);
    } catch {
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [entryId, router]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (isCorrect: boolean) => {
    if (!user) { router.push(`/${locale}/login`); return; }
    setVerifyError(null);

    if (entry?.user_vote === isCorrect) {
      // Toggle off
      setVerifyLoading(true);
      const res = await fetch(`/api/entries/${entryId}/verify`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setEntry((prev) => prev ? { ...prev, ...data } : prev);
      }
      setVerifyLoading(false);
      return;
    }

    setVerifyLoading(true);
    const res = await fetch(`/api/entries/${entryId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_correct: isCorrect }),
    });

    if (res.ok) {
      const data = await res.json();
      setEntry((prev) => prev ? { ...prev, ...data } : prev);
      // 価格が違うと評価した場合、価格修正UIを自動で開く
      if (!isCorrect) {
        setEditingPrice(true);
        setNewPrice('');
      }
    } else {
      const err = await res.json();
      setVerifyError(err.error || '評価に失敗しました');
    }
    setVerifyLoading(false);
  };

  const handlePriceSubmit = async () => {
    const price = parseFloat(newPrice);
    if (!price || price <= 0) return;
    setPriceSubmitting(true);
    const res = await fetch(`/api/entries/${entryId}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    });
    if (res.ok) {
      const data = await res.json();
      router.replace(`/${locale}/entries/${data.new_entry_id}`);
    }
    setPriceSubmitting(false);
    setEditingPrice(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) return null;

  const emoji = getEmoji(entry.item_name, entry.item_category);
  const maxPrice = Math.max(...history.map((h) => h.price), 1);
  const minPrice = Math.min(...history.map((h) => h.price));

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-on-surface text-[22px]">arrow_back</span>
        </button>
        <h1 className="font-bold text-on-background flex-1 truncate">商品詳細</h1>
        <span className="text-xs text-on-surface-variant/60">{timeAgo(entry.created_at)}</span>
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center text-4xl shrink-0 border border-white/5">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-on-surface-variant/60 font-medium mb-0.5">{entry.item_category}</p>
          <h2 className="text-2xl font-extrabold text-on-background leading-tight">{entry.item_name}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{entry.item_unit}</p>
        </div>
      </div>

      {/* Store info */}
      <div className="mx-5 bg-surface-container rounded-2xl px-4 py-3.5 border border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}>store</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-on-background text-sm truncate">{entry.store_name}</p>
          <p className="text-xs text-on-surface-variant/60 truncate mt-0.5">{entry.store_address}</p>
        </div>
      </div>

      {/* Current Price */}
      <div className="mx-5 mt-3 bg-surface-container rounded-2xl px-4 py-4 border border-white/5">
        <p className="text-xs text-on-surface-variant/60 font-medium mb-2">現在の価格</p>
        {editingPrice && entry.user_vote === false && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-error font-medium">
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            正しい価格を入力して修正してください
          </div>
        )}
        {editingPrice ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 relative pb-5">
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={String(entry.price)}
                autoFocus
                className={`w-full bg-surface-container-high border rounded-xl px-4 py-2.5 text-on-background text-xl font-bold focus:outline-none transition-colors ${
                  newPrice && Number(newPrice) === entry.price
                    ? 'border-error/60 focus:border-error'
                    : 'border-primary/40 focus:border-primary'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-sm">円</span>
            </div>
            {newPrice && Number(newPrice) === entry.price && (
              <p className="absolute -bottom-5 left-0 text-[10px] text-error">現在と同じ価格です</p>
            )}
            <button
              onClick={handlePriceSubmit}
              disabled={priceSubmitting || !newPrice || Number(newPrice) === entry.price}
              className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {priceSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">check</span>
              )}
              更新
            </button>
            <button
              onClick={() => { setEditingPrice(false); setNewPrice(''); }}
              className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
            </button>
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-primary">{entry.price.toLocaleString()}</span>
              <span className="text-lg text-on-surface-variant font-bold">円</span>
            </div>
            {user && (
              <button
                onClick={() => { setEditingPrice(true); setNewPrice(String(entry.price)); }}
                className="flex items-center gap-1.5 bg-surface-container-high px-3 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-background transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                価格を修正
              </button>
            )}
          </div>
        )}
      </div>

      {/* Price Trend */}
      {history.length > 1 && (
        <div className="mx-5 mt-3 bg-surface-container rounded-2xl px-4 py-4 border border-white/5">
          <p className="text-xs text-on-surface-variant/60 font-medium mb-4">価格動向</p>
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-16 mb-3">
            {history.slice(0, 8).reverse().map((h, i) => {
              const pct = maxPrice === minPrice ? 60 : 20 + ((h.price - minPrice) / (maxPrice - minPrice)) * 60;
              const isLatest = i === history.slice(0, 8).reverse().length - 1;
              return (
                <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all ${isLatest ? 'bg-primary' : 'bg-surface-container-high'}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>
          {/* Price history list */}
          <div className="space-y-2 mt-4 max-h-40 overflow-y-auto no-scrollbar">
            {history.map((h, i) => (
              <div key={h.id} className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant/60">{new Date(h.created_at).toLocaleDateString('ja-JP')}</span>
                <div className="flex items-center gap-2">
                  {i === 0 && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">最新</span>
                  )}
                  <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-on-background'}`}>
                    {h.price.toLocaleString()}円
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Score */}
      <div className="mx-5 mt-3 bg-surface-container rounded-2xl px-4 py-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-on-surface-variant/60 font-medium">信頼度</p>
          <TrustBadge score={entry.trust_score} />
        </div>

        {entry.total_verifications > 0 ? (
          <>
            {/* Progress bar */}
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all duration-700"
                style={{ width: `${entry.trust_score ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="flex items-center gap-1 text-tertiary font-bold">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                合ってる {entry.correct_count}票
              </span>
              <span className="text-on-surface-variant/50">{entry.total_verifications}人が評価</span>
              <span className="flex items-center gap-1 text-error font-bold">
                違う {entry.wrong_count}票
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-on-surface-variant/50">まだ評価されていません。最初の評価者になろう！</p>
        )}
      </div>

      {/* Verify Buttons */}
      <div className="mx-5 mt-3">
        {verifyError && (
          <div className="mb-3 px-4 py-3 bg-error/10 border border-error/20 rounded-2xl">
            <p className="text-sm text-error font-medium text-center">{verifyError}</p>
          </div>
        )}
        {!user ? (
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
            ログインして評価する
          </button>
        ) : (
          <div>
            <p className="text-xs text-on-surface-variant/60 font-medium mb-2.5 text-center">この価格は正しいですか？</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleVerify(true)}
                disabled={verifyLoading}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  entry.user_vote === true
                    ? 'bg-tertiary/20 text-tertiary border-2 border-tertiary/50'
                    : 'bg-surface-container border border-white/10 text-on-surface-variant hover:border-tertiary/30'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: entry.user_vote === true ? "'FILL' 1" : "'FILL' 0" }}>
                  thumb_up
                </span>
                価格合ってる
                {entry.correct_count > 0 && (
                  <span className="text-xs opacity-70">{entry.correct_count}</span>
                )}
              </button>
              <button
                onClick={() => handleVerify(false)}
                disabled={verifyLoading}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  entry.user_vote === false
                    ? 'bg-error/20 text-error border-2 border-error/50'
                    : 'bg-surface-container border border-white/10 text-on-surface-variant hover:border-error/30'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: entry.user_vote === false ? "'FILL' 1" : "'FILL' 0" }}>
                  thumb_down
                </span>
                価格違う
                {entry.wrong_count > 0 && (
                  <span className="text-xs opacity-70">{entry.wrong_count}</span>
                )}
              </button>
            </div>
            {entry.user_vote !== null && (
              <p className="text-center text-xs text-on-surface-variant/50 mt-2">
                もう一度押すと評価を取り消せます
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
