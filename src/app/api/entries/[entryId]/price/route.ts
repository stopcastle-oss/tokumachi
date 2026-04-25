import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const body = await request.json() as { price: number };
  const { price } = body;

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
    .eq('id', entryId).single();

  if (fetchError || !original) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  if (Math.round(price) === original.price) return NextResponse.json({ error: '現在と同じ価格は登録できません' }, { status: 400 });

  const ageMs = Date.now() - new Date(original.created_at).getTime();
  const withinOneHour = ageMs < 60 * 60 * 1000;

  const { data: verifs } = await svc
    .from('price_verifications').select('is_correct').eq('price_entry_id', entryId);
  const totalVotes = (verifs ?? []).length;
  const correctVotes = (verifs ?? []).filter((v: { is_correct: boolean }) => v.is_correct).length;

  // Case 1: direct edit — within 1h, no votes
  if (withinOneHour && totalVotes === 0) {
    const { data: newEntry, error } = await svc
      .from('price_entries')
      .insert({ store_id: original.store_id, item_id: original.item_id, user_id: user.id, price: Math.round(price), status: 'active' })
      .select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await svc.rpc('increment_points', { p_user_id: user.id, p_points: 5 });
    return NextResponse.json({ mode: 'direct', new_entry_id: newEntry.id });
  }

  // Case 2: propose — after 1h + at least 1 correct vote
  if (!withinOneHour && correctVotes > 0) {
    const { data: existing } = await svc
      .from('price_entries').select('id')
      .eq('original_entry_id', entryId).eq('status', 'pending_update').maybeSingle();
    if (existing) return NextResponse.json({ error: 'すでに価格更新が提案されています' }, { status: 409 });

    const { error: insertError } = await svc
      .from('price_entries')
      .insert({ store_id: original.store_id, item_id: original.item_id, user_id: user.id, price: Math.round(price), status: 'pending_update', original_entry_id: entryId });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    await svc.rpc('increment_points', { p_user_id: user.id, p_points: 3 });
    return NextResponse.json({ mode: 'proposed', original_entry_id: entryId });
  }

  const reason = withinOneHour ? '評価が入ると直接修正できません' : '価格更新の提案には1件以上の「合ってる」評価が必要です';
  return NextResponse.json({ error: reason }, { status: 403 });
}
