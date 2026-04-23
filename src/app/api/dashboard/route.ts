import { createServiceClient } from '@/lib/supabase/server';
import { DashboardResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Call the dashboard stats function
    const { data, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
      console.error('Dashboard stats error:', error);
      return Response.json(
        { error: 'Failed to fetch dashboard stats' },
        { status: 500 }
      );
    }

    // Parse the JSON fields returned from the database
    const stats = data?.[0] || {
      today_entries_count: 0,
      trending_items: [],
      top_liked_entries: [],
    };

    // Top 3 most searched items
    const { data: hotSearches } = await supabase
      .from('items')
      .select('id, name_ja, search_count')
      .gt('search_count', 0)
      .order('search_count', { ascending: false })
      .limit(3);

    const response: DashboardResponse = {
      today_entries_count: stats.today_entries_count || 0,
      trending_items: stats.trending_items || [],
      top_liked_entries: stats.top_liked_entries || [],
      popular_searches: (hotSearches || []).map((item) => ({
        item_id: item.id,
        name_ja: item.name_ja,
        search_count: item.search_count,
      })),
    };

    return Response.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('Dashboard endpoint error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
