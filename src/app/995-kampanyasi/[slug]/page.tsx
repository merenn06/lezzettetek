import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCampaign995PackageBySlug } from '@/lib/campaign995/fetch-packages';
import { CAMPAIGN_995_PRICE } from '@/lib/campaign995/packages';
import Campaign995DetailClient from './Campaign995DetailClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await fetchCampaign995PackageBySlug(slug);

  if (!pkg) {
    return { title: 'Kampanya Paketi | Tek Lezzet' };
  }

  return {
    title: `${pkg.name} — ${CAMPAIGN_995_PRICE} TL | Tek Lezzet`,
    description: `${pkg.quantityLabel} ${pkg.name} kampanya paketi ${CAMPAIGN_995_PRICE} TL.`,
    robots: { index: true, follow: true },
  };
}

export default async function Campaign995DetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pkg = await fetchCampaign995PackageBySlug(slug);

  if (!pkg) {
    notFound();
  }

  return <Campaign995DetailClient pkg={pkg} />;
}
