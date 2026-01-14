import { createSupabasePublicClient } from '@/lib/supabase/public';
import type { Campaign } from '@/types/campaign';
import CampaignsPageClient from './CampaignsPageClient';

export const dynamic = 'force-dynamic';

export default async function KampanyalarPage() {
  let campaigns: Campaign[] = [];

  try {
    const supabase = createSupabasePublicClient();

    if (!supabase) {
      console.warn('[kampanyalar] Supabase client not available, returning empty campaigns');
      return <CampaignsPageClient campaigns={campaigns} />;
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      // Tablo yoksa veya RLS hatası varsa sessizce boş array döndür
      if (error.code === 'PGRST116' || error.code === '42P01') {
        // Tablo bulunamadı hatası - sessizce devam et
        console.warn('[kampanyalar] campaigns table not found or not accessible');
      } else {
        console.error('[kampanyalar] campaigns fetch error', error);
      }
    } else {
      campaigns = (data ?? []) as Campaign[];
    }
  } catch (err) {
    // Client oluşturma hatası veya diğer beklenmeyen hatalar
    console.error('[kampanyalar] Unexpected error fetching campaigns', err);
  }

  return <CampaignsPageClient campaigns={campaigns} />;
}

