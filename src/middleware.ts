import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['ja'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/', '/(ja)/:path*'],
};
