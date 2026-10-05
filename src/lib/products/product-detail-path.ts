import { campaign995DetailPath } from '@/lib/campaign995/packages';
import type { Product } from '@/types/product';

type ProductLinkInput = Pick<Product, 'slug' | 'sales_channel'>;

/** Perakende ve 995 kampanya detay route'ları */
export function getProductDetailPath(product: ProductLinkInput): string {
  if (product.sales_channel === 'campaign_995') {
    return campaign995DetailPath(product.slug);
  }
  return `/urunlerimiz/${product.slug}`;
}
