import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const { is_correct } = await request.json();

  if (typeof is_correct !== 'boolean') {
    return NextResponse.json({ error: 'is_correct must be boolean' }, { status: 400 });
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();

  // Prevent user from verifying their own entry
  const { data: entry } = await svc
    .from('price_entries')
    .select('user_id')
    .eq('id', entryId)
    .single();

  if (entry?.user_id === user.id) {
    return NextResponse.json({ error: '自分の登録は評価できません' }, { status: 403 });
  }

  // Upsert verification (allows changing vote)
  const { error } = await svc
    .from('price_verifications')
    .upsert(
      { price_entry_id: entryId, user_id: user.id, is_correct },
      { onConflict: 'price_entry_id,user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award 1 trust point to entry creator when someone votes "correct"
  if (is_correct && entry?.user_id) {
    await svc.rpc('increment_points', { p_user_id: entry.user_id, p_points: 1 });
  }

  // Return updated counts
  const { data: vData } = await svc
    .from('price_verifications')
    .select('is_correct')
    .eq('price_entry_id', entryId);

  const verifications = vData || [];
  const correctCount = verifications.filter((v) => v.is_correct).length;
  const wrongCount = verifications.filter((v) => !v.is_correct).length;
  const total = verifications.length;

  return NextResponse.json({
    correct_count: correctCount,
    wrong_count: wrongCount,
    total_verifications: total,
    trust_score: total > 0 ? Math.round((correctCount / total) * 100) : null,
    user_vote: is_correct,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();
  await svc
    .from('price_verifications')
    .delete()
    .eq('price_entry_id', entryId)
    .eq('user_id', user.id);

  const { data: vData } = await svc
    .from('price_verifications')
    .select('is_correct')
    .eq('price_entry_id', entryId);

  const verifications = vData || [];
  const correctCount = verifications.filter((v) => v.is_correct).length;
  const wrongCount = verifications.filter((v) => !v.is_correct).length;
  const total = verifications.length;

  return NextResponse.json({
    correct_count: correctCount,
    wrong_count: wrongCount,
    total_verifications: total,
    trust_score: total > 0 ? Math.round((correctCount / total) * 100) : null,
    user_vote: null,
  });
}
