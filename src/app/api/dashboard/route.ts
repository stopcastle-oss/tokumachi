import { createServiceClient } from '@/lib/supabase/server';
import { DashboardResponse } from '@/types';

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

    const response: DashboardResponse = {
      today_entries_count: stats.today_entries_count || 0,
      trending_items: stats.trending_items || [],
      top_liked_entries: stats.top_liked_entries || [],
      popular_searches: [], // Not included in current DB function
    };

    // Cache response for 60 seconds
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    headers.set('Content-Type', 'application/json');

    return Response.json(response, { headers });
  } catch (err) {
    console.error('Dashboard endpoint error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
