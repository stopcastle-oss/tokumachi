import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Increment search_count when user selects an item
export async function POST(
  _request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('items')
    .select('search_count')
    .eq('id', params.itemId)
    .single();

  if (data) {
    await supabase
      .from('items')
      .update({ search_count: (data.search_count ?? 0) + 1 })
      .eq('id', params.itemId);
  }

  return NextResponse.json({ ok: true });
}
