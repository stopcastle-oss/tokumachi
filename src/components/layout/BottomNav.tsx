'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const BottomNav = () => {
  const t = useTranslations();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/', label: t('common.home'), icon: '🏠' },
    { href: '/map', label: t('common.map'), icon: '🗺️' },
    { href: '/search', label: t('common.search'), icon: '🔍' },
    { href: '/register', label: t('common.register'), icon: '➕' },
    { href: '/profile', label: t('common.profile'), icon: '👤' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/ja';
    }
    return pathname.includes(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-3 px-4 flex-1 ${
              isActive(item.href)
                ? 'text-primary border-t-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
