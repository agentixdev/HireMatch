import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    types: {
      'application/rss+xml': '/api/blog/feed',
    },
  },
};

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd(locale)) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
      <Footer />
    </>
  );
}
