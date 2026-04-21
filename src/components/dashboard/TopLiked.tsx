'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PriceEntry } from '@/types';

interface TopLikedProps {
  entries: PriceEntry[];
  isLoading?: boolean;
}

export default function TopLiked({ entries, isLoading = false }: TopLikedProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('home.topLiked')}</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('home.topLiked')}</h2>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/${locale}/map?store_id=${entry.store_id}`}
            className="block"
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md dark:hover:shadow-black/20 transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {entry.price.toLocaleString()} 円
                  </p>
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <span className="text-sm">❤️</span>
                  <span className="text-sm font-semibold">{entry.like_count}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                {new Date(entry.created_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
