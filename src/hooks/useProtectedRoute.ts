'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export const useProtectedRoute = () => {
  const router = useRouter();
  const { user, loading, initialized } = useAuth();

  useEffect(() => {
    if (initialized && !loading && !user) {
      // Get current path for redirect
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, initialized, router]);

  return { isProtected: true, canAccess: !!user && !loading };
};
