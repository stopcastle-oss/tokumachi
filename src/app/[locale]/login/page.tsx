'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 mb-5 shadow-lg shadow-blue-500/30">
          <span className="text-3xl">🛒</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">TokuMachi</h1>
        <p className="text-[#7d8590] text-sm mt-1">お得な価格情報をみんなでシェア</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-1 text-center">
            ログインして始める
          </h2>
          <p className="text-[#7d8590] text-sm text-center mb-6">
            アカウントでサインインしてください
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs text-center break-all">
              {authError}
            </div>
          )}

          <OAuthButtons />
        </div>

        {/* Terms */}
        <p className="text-[#7d8590] text-xs text-center mt-5 leading-relaxed">
          続行することで、
          <span className="text-blue-400 hover:underline cursor-pointer">利用規約</span>
          および
          <span className="text-blue-400 hover:underline cursor-pointer">プライバシーポリシー</span>
          に同意したことになります。
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
