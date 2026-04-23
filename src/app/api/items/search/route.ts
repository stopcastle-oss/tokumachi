import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  const supabase = createServiceClient();

  const query = supabase
    .from('items')
    .select('id, name_ja, name_ko, category, unit')
    .order('search_count', { ascending: false })
    .limit(20);

  if (q.trim()) {
    query.ilike('name_ja', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data });
}
