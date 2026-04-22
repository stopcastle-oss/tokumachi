'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/store/dashboard';

export const Header = () => {
  const { user, profile } = useAuth();
  const { todayCount } = useDashboardStore();
  const locale = useLocale();

  return (
    <header className="bg-surface-container-lowest sticky top-0 z-50 flex items-center justify-between w-full px-4 h-16 border-b border-orange-900/20 shadow-sm">
      {/* Location */}
      <Link href={`/${locale}`} className="flex items-center gap-1.5 active:scale-95 transition-transform duration-200">
        <span className="material-symbols-outlined text-primary text-[22px]"
          style={{ fontVariationSettings: "'FILL' 1" }}>
          location_on
        </span>
        <span className="font-bold text-lg text-on-background">
          {profile?.city || '東京都足立区'}
        </span>
      </Link>

      {/* Right side */}
      {user ? (
        <div className="flex items-center gap-2">
          {todayCount > 0 && (
            <div className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg shadow-orange-900/40">
              今日 {todayCount}件 登録!
            </div>
          )}
          <Link href={`/${locale}/profile`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border-2 border-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]">person</span>
              </div>
            )}
          </Link>
        </div>
      ) : (
        <Link
          href={`/${locale}/login`}
          className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg shadow-orange-900/40"
        >
          ログイン
        </Link>
      )}
    </header>
  );
};
