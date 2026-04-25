import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CACHE_HOURS = 24;

export async function POST(request: Request) {
  const { lat, lng, radius = 1500 } = await request.json() as { lat: number; lng: number; radius?: number };

  if (!lat || !lng) return Response.json({ error: 'lat and lng are required' }, { status: 400 });

  const supabase = createServiceClient();

  // 24시간 이내에 같은 지역 임포트 기록 확인 (stores 테이블 직접 조회)
  const cacheAfter = new Date(Date.now() - CACHE_HOURS * 3600000).toISOString();
  const { data: recent } = await supabase
    .from('stores')
    .select('id')
    .gte('updated_at', cacheAfter)
    .limit(1);

  if (recent && recent.length > 0) {
    return Response.json({ imported: 0, cached: true });
  }

  // Google Places 호출 (language=ja로 일본어 이름 취득)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=supermarket&language=ja&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json() as { results?: Array<{
    place_id: string; name: string; vicinity: string;
    geometry: { location: { lat: number; lng: number } };
  }> };

  if (!data.results?.length) return Response.json({ imported: 0 });

  const now = new Date().toISOString();
  const stores = data.results.map((place) => ({
    id: place.place_id,
    google_place_id: place.place_id,
    name_ja: place.name,
    name_ko: null,
    address: place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    created_by: null,
    updated_at: now,
  }));

  const { error } = await supabase.from('stores').upsert(stores, { onConflict: 'id' });
  if (error) return Response.json({ error: 'Failed to import stores' }, { status: 500 });

  return Response.json({ imported: stores.length, cached: false });
}
