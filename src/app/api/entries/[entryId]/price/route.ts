import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  const { data: original, error: fetchError } = await svc
    .from('price_entries')
    .select('store_id, item_id, price, created_at')
    .eq('id', entryId)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (Math.round(price) === original.price) {
    return NextResponse.json({ error: '現在と同じ価格は登録できません' }, { status: 400 });
  }

  const ageMs = Date.now() - new Date(original.created_at).getTime();
  const withinOneHour = ageMs < 60 * 60 * 1000;

  const { count } = await svc
    .from('price_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('price_entry_id', entryId);

  const hasVerifications = (count ?? 0) > 0;

  if (hasVerifications || !withinOneHour) {
    const reason = hasVerifications ? '評価済みの価格は修正できません' : '登録から1時間を過ぎた価格は修正できません';
    return NextResponse.json({ error: reason }, { status: 403 });
  }

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

  await svc.rpc('increment_points', { p_user_id: user.id, p_points: 5 });

  return NextResponse.json({ new_entry_id: newEntry.id });
}
