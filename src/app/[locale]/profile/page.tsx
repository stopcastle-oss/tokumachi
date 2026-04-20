'use client';

import { useTranslations } from 'next-intl';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const t = useTranslations();
  useProtectedRoute();
  const { profile } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('profile.title')}</h1>
      {profile && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">{t('common.appName')}</label>
              <p className="text-lg font-medium">{profile.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('profile.points')}</label>
              <p className="text-2xl font-bold text-primary">{profile.total_points}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('profile.title_label')}</label>
              <p className="text-lg font-medium">{profile.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
