import { createServiceClient } from '@/lib/supabase/server';
import { DashboardResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Today's count (Asia/Tokyo)
    const nowTokyo = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = nowTokyo.toISOString().slice(0, 10); // YYYY-MM-DD
    const todayStart = new Date(`${todayStr}T00:00:00+09:00`).toISOString();
    const todayEnd = new Date(`${todayStr}T23:59:59+09:00`).toISOString();

    const { count: todayCount } = await supabase
      .from('price_entries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    // Trending items (most registered today)
    const { data: todayEntries } = await supabase
      .from('price_entries')
      .select('item_id, items:item_id(name_ja)')
      .eq('status', 'active')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const itemCounts: Record<string, { name_ja: string; count: number }> = {};
    for (const e of todayEntries ?? []) {
      const item = Array.isArray(e.items) ? e.items[0] : e.items;
      const name = (item as { name_ja: string } | null)?.name_ja ?? '';
      if (!itemCounts[e.item_id]) itemCounts[e.item_id] = { name_ja: name, count: 0 };
      itemCounts[e.item_id].count++;
    }
    const trendingItems = Object.entries(itemCounts)
      .map(([item_id, v]) => ({ item_id, name_ja: v.name_ja, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top liked entries (deduplicated by store+item, latest price only)
    const { data: allEntries } = await supabase
      .from('price_entries')
      .select(`
        id, price, like_count, created_at, store_id, item_id,
        items:item_id(name_ja),
        stores:store_id(name_ja)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    // Deduplicate: keep latest per store+item
    const seen = new Set<string>();
    const deduped = [];
    for (const e of allEntries ?? []) {
      const key = `${e.store_id}:${e.item_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(e);
      if (deduped.length >= 20) break;
    }

    // Get verification counts for deduped entries
    const entryIds = deduped.map((e) => e.id);
    const { data: verifications } = entryIds.length > 0
      ? await supabase
          .from('price_verifications')
          .select('price_entry_id, is_correct')
          .in('price_entry_id', entryIds)
      : { data: [] };

    const vMap: Record<string, { correct: number; total: number }> = {};
    for (const v of verifications ?? []) {
      if (!vMap[v.price_entry_id]) vMap[v.price_entry_id] = { correct: 0, total: 0 };
      vMap[v.price_entry_id].total++;
      if (v.is_correct) vMap[v.price_entry_id].correct++;
    }

    const topLikedEntries = deduped.map((e) => {
      const item = Array.isArray(e.items) ? e.items[0] : e.items;
      const store = Array.isArray(e.stores) ? e.stores[0] : e.stores;
      const v = vMap[e.id] ?? { correct: 0, total: 0 };
      return {
        id: e.id,
        price: e.price,
        like_count: e.like_count,
        created_at: e.created_at,
        store_id: e.store_id,
        item_id: e.item_id,
        item_name: (item as { name_ja: string } | null)?.name_ja ?? '不明',
        store_name: (store as { name_ja: string } | null)?.name_ja ?? '不明',
        correct_count: v.correct,
        total_verifications: v.total,
      };
    });

    // Popular searches (top 3 by search_count)
    const { data: hotSearches } = await supabase
      .from('items')
      .select('id, name_ja, search_count')
      .gt('search_count', 0)
      .order('search_count', { ascending: false })
      .limit(3);

    const response: DashboardResponse = {
      today_entries_count: todayCount ?? 0,
      trending_items: trendingItems,
      top_liked_entries: topLikedEntries,
      popular_searches: (hotSearches ?? []).map((item) => ({
        item_id: item.id,
        name_ja: item.name_ja,
        search_count: item.search_count,
      })),
    };

    return Response.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Dashboard endpoint error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
