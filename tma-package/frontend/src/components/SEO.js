import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for meta tags optimization
 * Optimized for Google Ads and organic search
 * Fixed for React 19 + react-helmet-async compatibility
 */
const SEO = ({
  title = 'Y-store - Інтернет-магазин електроніки та побутової техніки',
  description = 'Y-store - найкращий інтернет-магазин електроніки в Україні. Смартфони, ноутбуки, побутова техніка за найкращими цінами. Швидка доставка по всій Україні.',
  keywords = 'інтернет магазин, електроніка, смартфони, ноутбуки, побутова техніка, телевізори, купити онлайн, доставка',
  image = '/logo.png',
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  productData = null,
}) => {
  const siteUrl = process.env.REACT_APP_SITE_URL || 'https://ystore.ua';
  const fullUrl = url || siteUrl;
  const fullImageUrl = image && image.startsWith('http') ? image : `${siteUrl}${image || '/logo.png'}`;

  // Ensure all values are safe strings
  const safeTitle = String(title || 'Y-store - Інтернет-магазин електроніки та побутової техніки');
  const safeDescription = String(description || '');
  const safeKeywords = String(keywords || '');

  // Structured Data for Product (Schema.org)
  const productSchema = productData ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productData.name || '',
    "image": productData.images || [],
    "description": productData.description || '',
    "sku": productData.id || '',
    "brand": {
      "@type": "Brand",
      "name": "Y-store"
    },
    "offers": {
      "@type": "Offer",
      "url": fullUrl,
      "priceCurrency": "UAH",
      "price": productData.price || 0,
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  } : null;

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Y-store",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+380502474161",
      "contactType": "customer service",
      "areaServed": "UA",
      "availableLanguage": ["Ukrainian", "Russian"]
    },
    "sameAs": [
      "https://facebook.com/ystore",
      "https://instagram.com/ystore",
      "https://twitter.com/ystore"
    ]
  };

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="title" content={safeTitle} />
      <meta name="description" content={safeDescription} />
      <meta name="keywords" content={safeKeywords} />
      <link rel="canonical" href={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:locale" content="uk_UA" />
      <meta property="og:site_name" content="Y-store" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="theme-color" content="#1e40af" />
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
