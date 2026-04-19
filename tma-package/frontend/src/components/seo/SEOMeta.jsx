/**
 * BLOCK V2-24: SEO Meta Component
 * OpenGraph, Twitter Cards, Schema.org structured data
 * Fixed for React 19 + react-helmet-async compatibility
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Y-Store';
const SITE_URL = process.env.REACT_APP_BACKEND_URL || 'https://ystore.ua';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION = 'Y-Store - інтернет-магазин електроніки та техніки. Смартфони, ноутбуки, телевізори за найкращими цінами. Доставка по всій Україні.';

/**
 * SEO Meta tags component
 */
export default function SEOMeta({
  title = '',
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  product = null,
  breadcrumbs = null,
  keywords = 'електроніка, смартфони, техніка, інтернет-магазин, Україна'
}) {
  // Ensure all values are safe strings
  const safeTitle = String(title || '');
  const fullTitle = safeTitle ? `${safeTitle} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const safeDescription = String(description || DEFAULT_DESCRIPTION);
  const safeKeywords = String(keywords || '');
  const safeImage = String(image || DEFAULT_IMAGE);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={safeDescription} />
      <meta name="keywords" content={safeKeywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={safeImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="uk_UA" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={safeImage} />
      {product && product.price && (
        <meta property="product:price:amount" content={String(product.price)} />
      )}
      {product && (
        <meta property="product:price:currency" content="UAH" />
      )}
      {product && (
        <meta property="product:availability" content={product.stock > 0 ? 'in stock' : 'out of stock'} />
      )}
      {product && product.brand && (
        <meta property="product:brand" content={String(product.brand)} />
      )}
    </Helmet>
  );
}

/**
 * Product Schema.org structured data
 */
export function ProductSchema({ product }) {
  if (!product) return null;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name || product.title || '',
    "description": product.description || product.short_description || '',
    "image": product.images || [],
    "sku": product.sku || product.id || '',
    "brand": {
      "@type": "Brand",
      "name": product.brand || SITE_NAME
    },
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/product/${product.slug || product.id}`,
      "priceCurrency": "UAH",
      "price": product.price || 0,
      "availability": product.stock > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": SITE_NAME
      }
    }
  };

  if (product.rating && product.reviews_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.reviews_count
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

/**
 * Breadcrumb Schema.org structured data
 */
export function BreadcrumbSchema({ items }) {
  if (!items || items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name || '',
      "item": item.url ? `${SITE_URL}${item.url}` : undefined
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

/**
 * Organization Schema.org structured data
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+380502474161",
      "contactType": "customer service",
      "areaServed": "UA",
      "availableLanguage": ["Ukrainian", "Russian"]
    },
    "sameAs": [
      "https://t.me/ystore_shop",
      "https://instagram.com/ystore_shop",
      "https://facebook.com/ystore.shop"
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

/**
 * WebSite Schema.org structured data (for search)
 */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

/**
 * LocalBusiness Schema.org structured data
 */
export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Store",
    "name": SITE_NAME,
    "url": SITE_URL,
    "telephone": "+380502474161",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "UA"
    },
    "priceRange": "₴₴",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
      ],
      "opens": "09:00",
      "closes": "21:00"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
