'use client';

import { useTranslations } from 'next-intl';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function RegisterPage() {
  const t = useTranslations();
  useProtectedRoute();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('register.title')}</h1>
      <p className="text-gray-600">Price registration feature coming soon...</p>
    </div>
  );
}
