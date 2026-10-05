import type { Metadata } from 'next';
import Campaign995Client from './Campaign995Client';
import { fetchCampaign995Packages } from '@/lib/campaign995/fetch-packages';

export const metadata: Metadata = {
  title: '995 TL Kampanyası | Tek Lezzet',
  description:
    'Ne alırsan 995 TL — kampanya paketini seç, ücretsiz kargo ile kapına gelsin. Kapıda ödeme seçenekleri.',
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function Campaign995Page() {
  const packages = await fetchCampaign995Packages();

  return <Campaign995Client packages={packages} />;
}
