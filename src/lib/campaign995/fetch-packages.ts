import { mapCampaign995RowToView } from '@/lib/campaign995/map-package';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { supabase as supabaseService } from '@/lib/supabaseClient';
import type { Campaign995PackageRow, Campaign995PackageView } from '@/types/campaign995-package';

const CAMPAIGN_995_PACKAGE_SELECT = `
  id,
  slug,
  name,
  pack_quantity,
  quantity_label,
  price,
  image_url,
  description,
  section,
  card_style,
  product_id,
  is_active,
  sort_order,
  created_at,
  product:products!product_id (
    id,
    name,
    slug,
    price,
    stock,
    description,
    image_url,
    is_active,
    sales_channel
  )
`;

function getCampaign995Supabase() {
  return supabaseService ?? createSupabasePublicClient();
}

export async function fetchCampaign995Packages(): Promise<Campaign995PackageView[]> {
  const supabase = getCampaign995Supabase();
  if (!supabase) {
    console.warn('[campaign995] Supabase client unavailable');
    return [];
  }

  const { data, error } = await supabase
    .from('campaign_995_packages')
    .select(CAMPAIGN_995_PACKAGE_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST116') {
      console.warn('[campaign995] campaign_995_packages not available yet');
      return [];
    }
    console.error('[campaign995] fetch error', error);
    return [];
  }

  const rows = (data ?? []) as Campaign995PackageRow[];
  return rows
    .map(mapCampaign995RowToView)
    .filter((pkg): pkg is Campaign995PackageView => pkg !== null);
}

export async function fetchCampaign995PackageBySlug(
  slug: string
): Promise<Campaign995PackageView | null> {
  const supabase = getCampaign995Supabase();
  if (!supabase) {
    console.warn('[campaign995] Supabase client unavailable');
    return null;
  }

  const { data, error } = await supabase
    .from('campaign_995_packages')
    .select(CAMPAIGN_995_PACKAGE_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST116') {
      console.warn('[campaign995] campaign_995_packages not available yet');
      return null;
    }
    console.error('[campaign995] fetch by slug error', error);
    return null;
  }

  if (!data) return null;

  return mapCampaign995RowToView(data as Campaign995PackageRow);
}

export function getPackagesBySection(
  packages: Campaign995PackageView[],
  section: Campaign995PackageView['section']
): Campaign995PackageView[] {
  return packages.filter((pkg) => pkg.section === section);
}
