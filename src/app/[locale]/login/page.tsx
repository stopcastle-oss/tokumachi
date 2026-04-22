'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const locale = useLocale();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      router.push(`/${locale}`);
    }
  }, [user, loading, router, locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top decorative area */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange-950/60 to-background flex-none h-56 flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-600/20 via-transparent to-transparent" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 mx-auto flex items-center justify-center shadow-2xl shadow-orange-900/60 mb-4">
            <span className="material-symbols-outlined text-white text-[40px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              storefront
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-background">TokuMachi</h1>
          <p className="text-sm text-on-surface-variant mt-1">お得な価格情報をみんなでシェア</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-8">
        <h2 className="text-2xl font-extrabold text-on-background mb-1">ログインして始める</h2>
        <p className="text-sm text-on-surface-variant mb-8">
          アカウントでサインインしてください
        </p>

        <OAuthButtons />

        {/* Benefits */}
        <div className="mt-8 space-y-3">
          {[
            { icon: 'local_fire_department', text: '近所の特売情報をリアルタイムで確認', fill: true },
            { icon: 'add_circle', text: '価格を登録してポイントをゲット', fill: true },
            { icon: 'emoji_events', text: 'ランキングに参加して特典をもらおう', fill: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-primary text-[20px]"
                  style={{ fontVariationSettings: item.fill ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-sm font-medium text-on-background">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-on-surface-variant/50 text-xs px-8 py-6 leading-relaxed">
        続行することで、
        <span className="text-primary">利用規約</span>
        および
        <span className="text-primary">プライバシーポリシー</span>
        に同意したことになります。
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
