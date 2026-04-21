'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';

type EmptyStateType = 'no_data_store' | 'no_search_result' | 'no_entries';

interface EmptyStateProps {
  type: EmptyStateType;
  storeId?: string;
  itemId?: string;
}

export default function EmptyState({ type, storeId, itemId }: EmptyStateProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();

  const getContent = () => {
    switch (type) {
      case 'no_data_store':
        return {
          emoji: '🏪',
          title: 'このスーパーにはまだ情報がありません',
          description: t('empty.noDataStore'),
          buttonText: '最初に登録する',
          href: storeId
            ? `/${locale}/register?store_id=${storeId}`
            : `/${locale}/register`,
        };
      case 'no_search_result':
        return {
          emoji: '🔍',
          title: 'この品目は見つかりません',
          description: t('empty.noSearchResult'),
          buttonText: '最初に登録する',
          href: itemId
            ? `/${locale}/register?item_id=${itemId}`
            : `/${locale}/register`,
        };
      case 'no_entries':
      default:
        return {
          emoji: '📊',
          title: 'まだ価格情報がありません',
          description: t('empty.noEntries'),
          buttonText: '今すぐ登録',
          href: `/${locale}/register`,
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4">{content.emoji}</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {content.title}
      </h2>
      <p className="text-gray-600 text-center mb-6 max-w-sm">
        {content.description}
      </p>
      {user ? (
        <Link
          href={content.href}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          {content.buttonText}
        </Link>
      ) : (
        <Link
          href={`/${locale}/login`}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          {t('common.login')}
        </Link>
      )}
    </div>
  );
}
