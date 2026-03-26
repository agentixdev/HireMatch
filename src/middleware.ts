import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/request';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // don't show /en/ prefix for default locale
});

export const config = {
  matcher: [
    // Match all pathnames except: api, _next, static files, favicon
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
