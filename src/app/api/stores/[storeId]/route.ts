import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  return Response.json({
    store,
    entries: entries || [],
    entry_count: entries?.length || 0,
  });
}
