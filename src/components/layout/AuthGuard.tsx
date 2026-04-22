'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublic =
    pathname === `/${locale}` ||
    pathname === '/' ||
    pathname === `/${locale}/login` ||
    pathname === '/login' ||
    pathname.startsWith('/auth');

  if (isPublic) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-2xl shadow-orange-900/50 mb-6">
          <span
            className="material-symbols-outlined text-white text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-on-background mb-2">
          ログインが必要です
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-8 max-w-xs">
          この機能を使うにはアカウントが必要です。
          <br />
          ログインして全ての機能を使いましょう！
        </p>

        {/* Benefits */}
        <div className="w-full max-w-xs space-y-2.5 mb-8">
          {[
            { icon: 'add_circle',           text: '価格情報を登録してポイントをゲット' },
            { icon: 'rate_review',          text: '価格の正確さを評価できる' },
            { icon: 'emoji_events',         text: 'ランキングで近所のヒーローになろう' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 border border-white/5">
              <span
                className="material-symbols-outlined text-primary text-[20px] shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium text-on-background text-left">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-900/40 active:scale-95 transition-transform"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              login
            </span>
            ログイン / 新規登録
          </button>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="w-full bg-surface-container text-on-surface-variant py-3.5 rounded-2xl font-bold text-sm border border-white/5 active:scale-95 transition-transform"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
