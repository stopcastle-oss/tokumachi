'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const t = useTranslations();
  const { user, profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-primary">
          {t('common.appName')}
        </Link>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="text-sm">
                <p className="font-medium">{profile?.name || user.email}</p>
                {profile?.title && (
                  <p className="text-gray-600 text-xs">{profile.title}</p>
                )}
              </div>
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('common.logout')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-blue-700"
            >
              {t('common.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
