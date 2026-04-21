'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { StoreWithDistance } from '@/types';

interface StorePopupProps {
  store: StoreWithDistance;
  onClose: () => void;
}

export default function StorePopup({ store, onClose }: StorePopupProps) {
  const locale = useLocale();
  const { user } = useAuth();

  const registerHref = `/${locale}/register?store_id=${store.id}`;
  const loginHref = `/${locale}/login`;
  const isPioneerOpportunity = store.entry_count === 0;

  return (
    <div className="absolute bottom-3 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 z-10">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-base text-gray-900 flex-1 pr-2">{store.name_ja}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-1">{store.address}</p>
      <p className="text-xs text-gray-400 mb-3">
        {store.distance_meters >= 1000
          ? `${(store.distance_meters / 1000).toFixed(1)}km`
          : `${store.distance_meters}m`}
      </p>

      {isPioneerOpportunity ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <p className="text-sm font-semibold text-amber-800 mb-0.5">🏆 開拓者チャンス！</p>
          <p className="text-xs text-amber-700">
            最初に登録して開拓者バッジと100ptを獲得しましょう
          </p>
        </div>
      ) : (
        <p className="text-sm text-primary font-medium mb-3">
          {store.entry_count}件の価格情報あり
        </p>
      )}

      {user ? (
        <Link
          href={registerHref}
          className="block w-full text-center py-2.5 bg-primary text-white text-sm rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          {isPioneerOpportunity ? '開拓者になる +100pt' : '価格を登録する'}
        </Link>
      ) : (
        <Link
          href={loginHref}
          className="block w-full text-center py-2.5 bg-primary text-white text-sm rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          ログインして登録する
        </Link>
      )}
    </div>
  );
}
