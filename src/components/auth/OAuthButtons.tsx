'use client';

import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export const OAuthButtons = () => {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(provider);
      setError(null);
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) setError(error.message);
    } catch {
      setError('認証に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Google */}
      <button
        onClick={() => handleOAuth('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {loading === 'google' ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Googleでログイン
      </button>

      {/* Apple */}
      <button
        onClick={() => handleOAuth('apple')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white font-medium rounded-lg border border-[#3a3a3c] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading === 'apple' ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.4.07 2.38.74 3.2.8 1.2-.24 2.37-.93 3.58-.84 1.52.12 2.66.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.32 2.99-2.66 4ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z"/>
          </svg>
        )}
        Appleでログイン
      </button>

      {/* Divider */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#30363d]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#161b22] px-3 text-[#7d8590]">または</span>
        </div>
      </div>

      <p className="text-center text-[#7d8590] text-sm py-1">
        他のログイン方法は近日公開予定
      </p>
    </div>
  );
};
