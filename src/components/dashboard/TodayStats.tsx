'use client';

import { useTranslations } from 'next-intl';

interface TodayStatsProps {
  count: number;
  isLoading?: boolean;
}

export default function TodayStats({ count, isLoading = false }: TodayStatsProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-blue-100 dark:border-blue-800/30">
      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
        {t('home.todayStats')}
      </h2>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
        <span className="text-lg text-gray-600 dark:text-gray-400">{t('home.entriesCount')}</span>
      </div>
    </div>
  );
}
