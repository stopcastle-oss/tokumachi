import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface NearbyRow { id: string; distance_meters: number }
interface ItemRow { id: string; name_ja: string; category: string; unit: string }
interface EntryRow { id: string; price: number; created_at: string; like_count: number; item_id: string; store_id: string }
interface StoreRow { id: string; name_ja: string; address: string; latitude: number; longitude: number }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');

  if (!q) return NextResponse.json({ results: [] });

  const supabase = createServiceClient();

  let storeIds: string[] | null = null;
  if (!isNaN(lat) && !isNaN(lng)) {
    const { data: nearby } = await supabase.rpc('get_nearby_stores', {
      p_latitude: lat, p_longitude: lng, p_radius_meters: 5000,
    });
    if (nearby && nearby.length > 0) storeIds = (nearby as NearbyRow[]).map((s) => s.id);
  }

  const { data: items } = await supabase
    .from('items').select('id, name_ja, category, unit')
    .ilike('name_ja', `%${q}%`).limit(30);

  if (!items || items.length === 0) return NextResponse.json({ results: [] });

  const itemMap: Record<string, ItemRow> = {};
  (items as ItemRow[]).forEach((i) => { itemMap[i.id] = i; });

  let query = supabase
    .from('price_entries').select('id, price, created_at, like_count, item_id, store_id')
    .eq('status', 'active').in('item_id', (items as ItemRow[]).map((i) => i.id))
    .order('price', { ascending: true }).limit(100);
  if (storeIds) query = query.in('store_id', storeIds);

  const { data: entries, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!entries || entries.length === 0) return NextResponse.json({ results: [] });

  const uniqueStoreIds = [...new Set((entries as EntryRow[]).map((e) => e.store_id))];
  const { data: stores } = await supabase
    .from('stores').select('id, name_ja, address, latitude, longitude').in('id', uniqueStoreIds);

  const storeMap: Record<string, StoreRow> = {};
  (stores as StoreRow[] ?? []).forEach((s) => { storeMap[s.id] = s; });

  const seen = new Set<string>();
  const results = [];

  for (const e of entries as EntryRow[]) {
    const key = `${e.item_id}:${e.store_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const item = itemMap[e.item_id];
    const store = storeMap[e.store_id];
    if (!item || !store) continue;

    let distance_meters: number | null = null;
    if (!isNaN(lat) && !isNaN(lng)) {
      const R = 6371000;
      const dLat = (store.latitude - lat) * Math.PI / 180;
      const dLng = (store.longitude - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      distance_meters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    results.push({
      entry_id: e.id, price: e.price, like_count: e.like_count, created_at: e.created_at,
      item_name: item.name_ja, category: item.category, unit: item.unit,
      store_name: store.name_ja, store_address: store.address, distance_meters,
    });
  }

  return NextResponse.json({ results });
}
