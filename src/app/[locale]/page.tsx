'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import TodayStats from '@/components/dashboard/TodayStats';
import TrendingItems from '@/components/dashboard/TrendingItems';
import TopLiked from '@/components/dashboard/TopLiked';
import EmptyState from '@/components/empty/EmptyState';
import { DashboardResponse } from '@/types';

export default function Home() {
  const t = useTranslations();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard');
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">{t('home.title')}</h1>
        <EmptyState type="no_entries" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">{t('home.title')}</h1>

      <TodayStats
        count={data?.today_entries_count || 0}
        isLoading={isLoading}
      />

      <TrendingItems
        items={data?.trending_items || []}
        isLoading={isLoading}
      />

      <TopLiked
        entries={data?.top_liked_entries || []}
        isLoading={isLoading}
      />

      {!isLoading &&
        (!data ||
          (data.today_entries_count === 0 &&
            (!data.trending_items || data.trending_items.length === 0) &&
            (!data.top_liked_entries || data.top_liked_entries.length === 0))) && (
          <EmptyState type="no_entries" />
        )}
    </div>
  );
}
