import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { lat, lng, radius = 1000 } = await request.json();

  if (!lat || !lng) {
    return Response.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=supermarket&language=ja&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results?.length) {
    return Response.json({ imported: 0 });
  }

  const supabase = createServiceClient();

  const stores = data.results.map((place: {
    place_id: string;
    name: string;
    vicinity: string;
    geometry: { location: { lat: number; lng: number } };
  }) => ({
    id: place.place_id,
    google_place_id: place.place_id,
    name_ja: place.name,
    name_ko: null,
    address: place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    created_by: null,
  }));

  const { error } = await supabase
    .from('stores')
    .upsert(stores, { onConflict: 'id' });

  if (error) {
    console.error('Import error:', error);
    return Response.json({ error: 'Failed to import stores' }, { status: 500 });
  }

  return Response.json({ imported: stores.length });
}
