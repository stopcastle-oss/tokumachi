import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function fetchPhoneFromGoogle(placeId: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&language=ja&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as { result?: { formatted_phone_number?: string } };
    return data.result?.formatted_phone_number ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { storeId: string } }
) {
  const supabase = createServiceClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', params.storeId)
    .single();

  if (storeError || !store) {
    return Response.json({ error: 'Store not found' }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from('price_entries')
    .select('id, price, like_count, created_at, item_id, items(name_ja)')
    .eq('store_id', params.storeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);

  // 전화번호: DB에 있으면 그대로, 없으면 Google Places에서 가져와 캐시
  let phoneNumber: string | null = store.phone_number ?? null;
  if (!phoneNumber) {
    phoneNumber = await fetchPhoneFromGoogle(store.google_place_id);
    if (phoneNumber) {
      // 캐시 저장 (컬럼이 없으면 무시)
      try {
        await supabase
          .from('stores')
          .update({ phone_number: phoneNumber } as Record<string, unknown>)
          .eq('id', params.storeId);
      } catch { /* 컬럼 없을 경우 무시 */ }
    }
  }

  return Response.json({
    store: { ...store, phone_number: phoneNumber },
    entries: entries || [],
    entry_count: entries?.length || 0,
  });
}
