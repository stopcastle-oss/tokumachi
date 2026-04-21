import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const intlMiddleware = createMiddleware({
  locales: ['ja'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
});

const protectedRoutes = ['/register', '/profile'];

export async function middleware(request: NextRequest) {
  // Apply next-intl middleware
  const intlResponse = intlMiddleware(request);

  // Check if the route is protected
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) =>
    pathname.includes(route)
  );

  if (isProtected) {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return path
      const loginUrl = new URL(`/ja/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(ja)/:path*'],
};

