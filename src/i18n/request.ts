import { getRequestConfig } from 'next-intl/server';

export const locales = [
  'en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no',
  'fi', 'pl', 'cs', 'ro', 'hi', 'ja', 'ko', 'zh', 'vi', 'tl'
] as const;

export const defaultLocale = 'en';

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale;
  const resolved = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
