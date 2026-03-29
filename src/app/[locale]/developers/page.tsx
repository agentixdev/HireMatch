import type { Metadata } from 'next';
import Header from '@/components/Header';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import DevApiDocs from './DevApiDocs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export const metadata: Metadata = {
  title: 'Visa Data API for Developers | HireMatch',
  description:
    'Integrate visa & work permit data into your platform. REST API with 29 countries, embeddable widget, real-time updates from official sources.',
  openGraph: {
    title: 'Visa Data API for Developers | HireMatch',
    description:
      'REST API for visa rules across 29 countries. Embeddable widget, pagination, filtering, and usage analytics.',
    url: `${SITE_URL}/developers`,
  },
};

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Developers', url: `${SITE_URL}/${locale}/developers` },
  ]);

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <DevApiDocs locale={locale} />
    </>
  );
}
