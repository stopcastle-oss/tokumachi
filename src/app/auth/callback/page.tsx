'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') || '/';

    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace('/login?error=auth_failed');
        } else {
          router.replace(redirect);
        }
      });
    } else {
      router.replace('/login?error=auth_failed');
    }
  }, [router, searchParams]);

  return <p className="text-gray-600">로그인 중...</p>;
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<p className="text-gray-600">로그인 중...</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
