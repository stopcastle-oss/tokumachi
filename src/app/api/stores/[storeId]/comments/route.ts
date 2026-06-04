import { createServiceClient, getCurrentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { storeId: string } }
) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('store_comments')
    .select('id, content, created_at, profiles(name)')
    .eq('store_id', params.storeId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ comments: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await request.json() as { content: string };
  if (!content?.trim()) return Response.json({ error: 'Content is required' }, { status: 400 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('store_comments')
    .insert({ store_id: params.storeId, user_id: user.id, content: content.trim() })
    .select('id, content, created_at, profiles(name)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ comment: data });
}
