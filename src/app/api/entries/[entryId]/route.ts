import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const supabase = createServiceClient();

  // Get current user (optional)
  let userId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {}

  // Entry + item + store
  const { data: entry, error } = await supabase
    .from('price_entries')
    .select(`
      id, item_id, store_id, user_id, price, like_count, status, created_at,
      items:item_id ( name_ja, category, unit ),
      stores:store_id ( name_ja, address )
    `)
    .eq('id', entryId)
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  // Verifications count
  const { data: vData } = await supabase
    .from('price_verifications')
    .select('is_correct')
    .eq('price_entry_id', entryId);

  const verifications = vData || [];
  const correctCount = verifications.filter((v) => v.is_correct).length;
  const wrongCount = verifications.filter((v) => !v.is_correct).length;
  const totalVerifications = verifications.length;
  const trustScore = totalVerifications > 0
    ? Math.round((correctCount / totalVerifications) * 100)
    : null;

  // User's own vote
  let userVote: boolean | null = null;
  if (userId) {
    const { data: myVote } = await supabase
      .from('price_verifications')
      .select('is_correct')
      .eq('price_entry_id', entryId)
      .eq('user_id', userId)
      .single();
    if (myVote) userVote = myVote.is_correct;
  }

  // Price history for same store + item
  const { data: history } = await supabase
    .from('price_entries')
    .select('id, price, created_at')
    .eq('store_id', entry.store_id)
    .eq('item_id', entry.item_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);

  const item = Array.isArray(entry.items)
    ? (entry.items[0] as { name_ja: string; category: string; unit: string } | undefined)
    : (entry.items as { name_ja: string; category: string; unit: string } | null);
  const store = Array.isArray(entry.stores)
    ? (entry.stores[0] as { name_ja: string; address: string } | undefined)
    : (entry.stores as { name_ja: string; address: string } | null);

  return NextResponse.json({
    entry: {
      ...entry,
      item_name: item?.name_ja ?? '不明',
      item_category: item?.category ?? '',
      item_unit: item?.unit ?? '',
      store_name: store?.name_ja ?? '不明',
      store_address: store?.address ?? '',
      correct_count: correctCount,
      wrong_count: wrongCount,
      total_verifications: totalVerifications,
      trust_score: trustScore,
      user_vote: userVote,
    },
    price_history: history || [],
  });
}
