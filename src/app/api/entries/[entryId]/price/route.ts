import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// PATCH: update price by creating a new entry for same store+item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const { price } = await request.json();

  if (!price || typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: '有効な価格を入力してください' }, { status: 400 });
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();

  // Get original entry's store + item
  const { data: original, error: fetchError } = await svc
    .from('price_entries')
    .select('store_id, item_id')
    .eq('id', entryId)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  // Create new price entry
  const { data: newEntry, error } = await svc
    .from('price_entries')
    .insert({
      store_id: original.store_id,
      item_id: original.item_id,
      user_id: user.id,
      price: Math.round(price),
      status: 'active',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award points for price update
  await svc.rpc('increment_points' as never, { p_user_id: user.id, p_points: 5 });

  return NextResponse.json({ new_entry_id: newEntry.id });
}
