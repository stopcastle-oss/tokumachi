'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

const navItems = [
  { key: 'home',    icon: 'home',   label: 'ホーム',     path: '' },
  { key: 'search',  icon: 'search', label: '検索',       path: '/search' },
  { key: 'map',     icon: 'map',    label: 'マップ',     path: '/map' },
  { key: 'profile', icon: 'person', label: 'マイページ', path: '/profile' },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const locale = useLocale();

  const isActive = (path: string) => {
    const full = `/${locale}${path}`;
    if (path === '') return pathname === `/${locale}` || pathname === '/';
    return pathname.startsWith(full);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex items-center px-3 py-2 pb-safe bg-surface-container-lowest rounded-t-2xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.key}
            href={`/${locale}${item.path}`}
            className="flex-1 flex justify-center active:scale-90 transition-transform duration-150"
          >
            <div className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-colors ${
              active
                ? 'bg-primary/20 text-primary'
                : 'text-on-surface-variant/40'
            }`}>
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[11px] font-bold">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
};
