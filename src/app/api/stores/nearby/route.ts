import { createServiceClient } from '@/lib/supabase/server';
import { StoreWithDistance } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseInt(searchParams.get('radius') || '5000');

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: nearbyData, error } = await supabase.rpc('get_nearby_stores', {
    p_latitude: lat,
    p_longitude: lng,
    p_radius_meters: radius,
  });

  if (error) {
    console.error('Nearby stores error:', error);
    return Response.json({ error: 'Failed to fetch nearby stores' }, { status: 500 });
  }

  if (!nearbyData || nearbyData.length === 0) {
    return Response.json({ stores: [] });
  }

  const storeIds = nearbyData.map((s: { id: string }) => s.id);
  const { data: entryCounts } = await supabase
    .from('price_entries')
    .select('store_id')
    .in('store_id', storeIds)
    .eq('status', 'active');

  const countMap: Record<string, number> = {};
  entryCounts?.forEach((e: { store_id: string }) => {
    countMap[e.store_id] = (countMap[e.store_id] || 0) + 1;
  });

  const stores: StoreWithDistance[] = nearbyData.map((s: {
    id: string;
    name_ja: string;
    name_ko: string | null;
    address: string;
    latitude: number;
    longitude: number;
    distance_meters: number;
  }) => ({
    id: s.id,
    name_ja: s.name_ja,
    name_ko: s.name_ko,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    google_place_id: s.id,
    created_by: '',
    created_at: '',
    updated_at: '',
    distance_meters: s.distance_meters,
    entry_count: countMap[s.id] || 0,
  }));

  return Response.json({ stores });
}
