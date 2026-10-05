export const CAMPAIGN_995_PRICE = 995;

export function campaign995DetailPath(slug: string): string {
  return `/995-kampanyasi/${slug}`;
}

export type Campaign995CategoryId = 'reklam' | 'tursu' | 'klasik' | 'ozel';

export type Campaign995Section = {
  id: Campaign995CategoryId;
  anchorId: string;
  title: string;
  subtitle?: string;
};

export const CAMPAIGN_995_SECTIONS: Campaign995Section[] = [
  {
    id: 'reklam',
    anchorId: 'kampanya-paketleri',
    title: 'REKLAMDAKİ FIRSATLAR',
    subtitle: 'Reklamda gördüğün paketler burada — hepsi aynı fiyat.',
  },
  {
    id: 'tursu',
    anchorId: 'tursu-sevenlere',
    title: 'TURŞU SEVENLERE',
  },
  {
    id: 'klasik',
    anchorId: 'sofranin-klasikleri',
    title: 'SOFRANIN KLASİKLERİ',
  },
  {
    id: 'ozel',
    anchorId: 'ozel-lezzetler',
    title: 'ÖZEL LEZZETLER',
  },
];
