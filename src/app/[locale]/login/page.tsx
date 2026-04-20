'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useEffect } from 'react';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If already logged in, redirect to home
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {t('common.appName')}
          </h1>
          <p className="text-gray-600">
            {t('auth.loginDescription')}
          </p>
        </div>

        <OAuthButtons />

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{t('auth.terms')}</p>
        </div>
      </div>
    </div>
  );
}
