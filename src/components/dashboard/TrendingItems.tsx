'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface TrendingItem {
  item_id: string;
  name_ja: string;
  count: number;
}

interface TrendingItemsProps {
  items: TrendingItem[];
  isLoading?: boolean;
}

export default function TrendingItems({ items, isLoading = false }: TrendingItemsProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('home.trendingItems')}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('home.trendingItems')}</h2>
      <div className="space-y-3">
        {items.slice(0, 3).map((item, index) => (
          <Link
            key={item.item_id}
            href={`/${locale}/search?item_id=${item.item_id}`}
            className="block"
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-black/20 transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{item.name_ja}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {item.count} 件
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
