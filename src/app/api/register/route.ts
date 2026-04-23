import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { store_id, store_name, store_address, store_lat, store_lng, item_id, price } = await request.json();

  if (!store_id || !item_id || !price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const service = createServiceClient();

  // Upsert store (Google Place ID as primary key)
  const { error: storeError } = await service.from('stores').upsert({
    id: store_id,
    name_ja: store_name,
    address: store_address,
    latitude: store_lat,
    longitude: store_lng,
    google_place_id: store_id,
    geom: `SRID=4326;POINT(${store_lng} ${store_lat})`,
    created_by: user.id,
  }, { onConflict: 'id', ignoreDuplicates: true });

  if (storeError) return NextResponse.json({ error: storeError.message }, { status: 500 });

  // Call register_price_and_award_points RPC
  const { data, error } = await service.rpc('register_price_and_award_points', {
    p_store_id: store_id,
    p_item_id: item_id,
    p_user_id: user.id,
    p_price: Math.round(price),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, entry_id: data[0]?.entry_id, points_awarded: data[0]?.points_awarded });
}
