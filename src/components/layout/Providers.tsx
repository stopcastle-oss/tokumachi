'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return <>{children}</>;
};
