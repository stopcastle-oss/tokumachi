'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/store/dashboard';
import { DashboardResponse, TopLikedEntry } from '@/types';

const ITEM_EMOJIS: Record<string, string> = {
  '野菜': '🥬', '果物': '🍎', '肉': '🥩', '魚': '🐟',
  '乳製品': '🥛', '卵': '🥚', '飲み物': '🧃', 'パン': '🍞',
  '冷凍': '🧊', 'お菓子': '🍫', '調味料': '🧂',
};

function getEmoji(itemName?: string): string {
  if (!itemName) return '🛒';
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    if (itemName.includes(key)) return emoji;
  }
  if (itemName.includes('牛乳') || itemName.includes('乳')) return '🥛';
  if (itemName.includes('卵') || itemName.includes('たまご')) return '🥚';
  if (itemName.includes('りんご') || itemName.includes('苺') || itemName.includes('いちご')) return '🍎';
  if (itemName.includes('キャベツ') || itemName.includes('レタス') || itemName.includes('ほうれん')) return '🥬';
  if (itemName.includes('豚') || itemName.includes('鶏') || itemName.includes('牛')) return '🥩';
  return '🛒';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export default function Home() {
  const locale = useLocale();
  const { user } = useAuth();
  const { setTodayCount } = useDashboardStore();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((result: DashboardResponse) => {
        setData(result);
        setTodayCount(result.today_entries_count || 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [setTodayCount]);

  const trending = data?.trending_items || [];
  const feed = data?.top_liked_entries || [];
  const todayCount = data?.today_entries_count || 0;

  return (
    <div className="pb-6">

      {/* Hero Banner */}
      <section className="px-5 pt-4">
        {!user ? (
          /* Login Incentive */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-xl shadow-black/30 p-5">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-orange-400/20 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-3">
                <span className="material-symbols-outlined text-[14px] mr-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                ウェルカム特典
              </div>
              <h2 className="text-2xl font-extrabold mb-1 leading-tight">
                今すぐログインして<br />10ポイントをゲット!
              </h2>
              <p className="text-sm text-orange-100/80 mb-4">
                割引情報を登録して、近所のランキングを上げましょう。
              </p>
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-5 py-2.5 rounded-full text-sm hover:bg-orange-50 transition-all active:scale-95"
              >
                ログイン
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Logged-in stats banner */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-xl shadow-black/30 p-5">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <p className="text-sm text-orange-100/80 mb-1">今日の登録件数</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-extrabold">{isLoading ? '—' : todayCount}</span>
                <span className="text-lg font-bold">件</span>
              </div>
              <Link
                href={`/${locale}/register`}
                className="inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-5 py-2.5 rounded-full text-sm hover:bg-orange-50 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                価格を登録する
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Trending Keywords */}
      {(isLoading || trending.length > 0) && (
        <section className="mt-8 px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px] bg-primary/10 p-1 rounded-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <h3 className="font-bold text-on-background">トレンドキーワード</h3>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
              Real-time
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {isLoading
              ? [1, 2, 3].map((i) => (
                <div key={i} className="h-11 w-24 rounded-2xl bg-surface-container animate-pulse shrink-0" />
              ))
              : trending.slice(0, 5).map((item, index) => (
                <Link
                  key={item.item_id}
                  href={`/${locale}/search?item_id=${item.item_id}`}
                  className="flex items-center gap-3 bg-surface-container border border-white/5 rounded-2xl pl-1 pr-5 py-1.5 shadow-sm active:bg-surface-container-high transition-all shrink-0"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md ${
                    index === 0
                      ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                      : index === 1
                      ? 'bg-primary/10 text-primary'
                      : 'bg-white/5 text-orange-300'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-on-background font-bold text-sm">{item.name_ja}</span>
                </Link>
              ))
            }
          </div>
        </section>
      )}

      {/* Popular Searches */}
      {(isLoading || (data?.popular_searches && data.popular_searches.length > 0)) && (
        <section className="mt-8 px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[22px] bg-primary/10 p-1 rounded-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                search
              </span>
              <h3 className="font-bold text-on-background">人気の検索ワード</h3>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
              Top 3
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isLoading
              ? [1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-20 rounded-full bg-surface-container animate-pulse" />
              ))
              : (data?.popular_searches || []).map((item, index) => (
                <Link
                  key={item.item_id}
                  href={`/${locale}/search?q=${encodeURIComponent(item.name_ja)}`}
                  className="flex items-center gap-2 bg-surface-container border border-white/10 rounded-full pl-2 pr-4 py-1.5 active:bg-surface-container-high transition-all"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                    index === 0
                      ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                      : index === 1
                      ? 'bg-primary/15 text-primary'
                      : 'bg-white/10 text-on-surface-variant'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-bold text-on-background">{item.name_ja}</span>
                </Link>
              ))
            }
          </div>
        </section>
      )}

      {/* Time Sale Feed */}
      <section className="mt-8 px-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-xl font-bold text-on-background">タイムセール</h3>
          </div>
          <Link
            href={`/${locale}/search`}
            className="text-primary font-bold text-sm flex items-center gap-0.5"
          >
            すべて見る
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading
            ? [1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-container rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-5 bg-white/10 rounded w-2/3" />
                  <div className="h-6 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))
            : feed.length === 0
            ? (
              <div className="bg-surface-container rounded-2xl p-8 text-center border border-white/5">
                <span className="text-4xl mb-3 block">🛒</span>
                <p className="text-on-surface-variant text-sm font-medium">まだ登録がありません</p>
                <p className="text-on-surface-variant/60 text-xs mt-1">最初に価格を登録してみましょう！</p>
                <Link
                  href={`/${locale}/register`}
                  className="inline-flex items-center gap-1.5 mt-4 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  登録する
                </Link>
              </div>
            )
            : feed.map((entry: TopLikedEntry) => (
              <FeedCard key={entry.id} entry={entry} locale={locale} />
            ))
          }
        </div>
      </section>

      {/* Community Teaser */}
      <section className="mt-8 px-5">
        <div className="bg-surface-container-high rounded-3xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-on-surface">ご近所ニュース</h3>
            <span className="material-symbols-outlined text-primary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            "今日、近所のスーパーでいちごが50%割引中! 早めに行くのがおすすめです"
          </p>
          <Link
            href={`/${locale}/register`}
            className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            情報を共有する
          </Link>
        </div>
      </section>

    </div>
  );
}

function FeedCard({ entry, locale }: { entry: TopLikedEntry; locale: string }) {
  const cardTrustScore = entry.total_verifications && entry.total_verifications > 0
    ? Math.round(((entry.correct_count ?? 0) / entry.total_verifications) * 100)
    : null;
  const emoji = getEmoji(entry.item_name);

  return (
    <Link href={`/${locale}/entries/${entry.id}`}>
      <div className="bg-surface-container p-4 rounded-2xl flex items-center gap-4 border border-white/5 active:bg-surface-container-high transition-colors relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-active:opacity-100 transition-opacity" />

        <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center text-3xl shrink-0">
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Store + time */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-on-surface-variant truncate">
              {entry.store_name || 'スーパー'}
            </span>
            <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded text-on-surface-variant shrink-0">
              {timeAgo(entry.created_at)}
            </span>
          </div>

          {/* Item name */}
          <h4 className="font-bold text-[18px] text-on-background mt-0.5 truncate">
            {entry.item_name || 'アイテム'}
          </h4>

          {/* Price + trust */}
          <div className="flex justify-between items-end mt-1">
            <span className="text-primary font-extrabold text-[22px]">
              {entry.price.toLocaleString()}円
            </span>
            {cardTrustScore !== null ? (
              <div className="flex items-center text-tertiary text-[10px] font-bold bg-tertiary/10 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[11px] mr-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                {cardTrustScore}%
              </div>
            ) : (
              <span className="text-[10px] text-on-surface-variant/40">未評価</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
