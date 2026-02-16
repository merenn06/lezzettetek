import type { Product } from '@/types/product';
import type { ProductReview, ReviewStats } from '@/types/review';

type ProductSchemaProps = {
  product: Product;
  reviews?: ProductReview[];
  stats?: ReviewStats;
  baseUrl?: string;
};

export function generateProductSchema({
  product,
  reviews = [],
  stats,
  baseUrl = 'https://lezzettetek.com',
}: ProductSchemaProps) {
  // Truncate description to 200-300 chars
  const description = product.description
    ? product.description.substring(0, 250).trim()
    : product.content
    ? product.content.substring(0, 250).trim()
    : '';

  // Build image array (ensure absolute URLs)
  const images: string[] = [];
  const imageUrls = [product.image_url, product.image_url_2].filter(Boolean) as string[];
  for (const imageUrl of imageUrls) {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      images.push(imageUrl);
    } else if (imageUrl.startsWith('/')) {
      images.push(`${baseUrl}${imageUrl}`);
    } else {
      images.push(`${baseUrl}/${imageUrl}`);
    }
  }

  // Build offers
  const offers: any = {
    '@type': 'Offer',
    priceCurrency: 'TRY',
    availability: 'https://schema.org/InStock',
    url: `${baseUrl}/urunlerimiz/${product.slug}`,
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: 150,
        currency: 'TRY',
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'TR',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 2,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 5,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'TR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnShippingFees',
    },
  };

  if (typeof product.price === 'number' && product.price > 0) {
    offers.price = product.price.toFixed(2);
  }

  // Base schema
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: description || product.name,
    sku: product.id || product.slug,
    brand: {
      '@type': 'Brand',
      name: 'Lezzettek',
    },
    seller: {
      '@type': 'Organization',
      name: 'Lezzettek',
      url: 'https://lezzettetek.com',
    },
    offers,
  };

  // Add image if available
  if (images.length > 0) {
    schema.image = images.length === 1 ? images[0] : images;
  }

  // Add reviews if available
  if (stats && stats.total_reviews > 0 && stats.average_rating > 0) {
    // Validate rating
    const ratingValue = Math.max(1, Math.min(5, stats.average_rating));

    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      reviewCount: stats.total_reviews,
    };

    // Add individual reviews (max 10)
    const validReviews = reviews
      .filter((review) => {
        // Validate: rating 1-5, comment not empty
        return (
          review.rating >= 1 &&
          review.rating <= 5 &&
          review.comment &&
          review.comment.trim().length > 0
        );
      })
      .slice(0, 10)
      .map((review) => {
        const reviewerName = review.reviewer_name || 'Müşteri';
        const reviewDate = new Date(review.created_at).toISOString();

        return {
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
          author: {
            '@type': 'Person',
            name: reviewerName,
          },
          datePublished: reviewDate,
          reviewBody: review.comment.trim(),
        };
      });

    if (validReviews.length > 0) {
      schema.review = validReviews;
    }
  }

  return schema;
}
