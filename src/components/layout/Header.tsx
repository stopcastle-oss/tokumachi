'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useDashboardStore } from '@/store/dashboard';
import { LocationPicker } from './LocationPicker';

export const Header = () => {
  const { user, profile, logout } = useAuth();
  const { todayCount } = useDashboardStore();
  const locale = useLocale();
  const { city, isLoading, isDenied, requestLocation, saveLocation } = useLocation();
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayCity = city ?? profile?.city ?? null;

  useEffect(() => {
    if (isDenied && !displayCity) setShowPicker(true);
  }, [isDenied, displayCity]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  return (
    <>
      <header className="bg-surface-container-lowest sticky top-0 z-50 flex items-center justify-between w-full px-4 h-16 border-b border-orange-900/20 shadow-sm">
        {/* Location */}
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 active:scale-95 transition-transform duration-200"
        >
          <span
            className="material-symbols-outlined text-primary text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            location_on
          </span>
          {isLoading && !displayCity ? (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <span className="font-bold text-lg text-on-background">
              {displayCity ?? '場所を設定'}
            </span>
          )}
          <span className="material-symbols-outlined text-on-surface-variant/50 text-[18px]">
            expand_more
          </span>
        </button>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-2">
            {todayCount > 0 && (
              <div className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg shadow-orange-900/40">
                今日 {todayCount}件 登録!
              </div>
            )}
            <div ref={menuRef} className="relative">
              <button onClick={() => setShowMenu((v) => !v)}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border-2 border-primary/30" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                  </div>
                )}
              </button>

              {showMenu && (
                <div className="absolute right-0 top-10 w-40 bg-surface-container border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
                  <Link
                    href={`/${locale}/profile`}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-on-background hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                    マイページ
                  </Link>
                  <div className="h-px bg-white/5" />
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      await logout();
                      window.location.href = `/${locale}`;
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-error hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
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

      {showPicker && (
        <LocationPicker
          currentCity={displayCity}
          isDenied={isDenied}
          onSave={saveLocation}
          onRequestGeo={requestLocation}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
};
