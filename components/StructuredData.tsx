/**
 * 🔍 Structured Data Component
 *
 * Adds JSON-LD structured data for SEO and rich snippets.
 * Helps search engines understand horoscope content.
 */

interface StructuredDataProps {
  horoscope?: {
    sign: string;
    period: string;
    text: string;
    date: string;
  };
}

export function StructuredData({ horoscope }: StructuredDataProps) {
  // Base organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Stargram",
    "url": "https://stargram.app",
    "description":
      "A hyperdimensional terminal that sources fortunes from the cosmos — real sky signals, purple phosphor, a bit haunted, a bit funny.",
    "applicationCategory": "LifestyleApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "creator": {
      "@type": "Person",
      "name": "Pablo Alvarado",
      "url": "https://pibul.us",
    },
  };

  // If horoscope data is provided, add Article schema
  const horoscopeSchema = horoscope
    ? {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": `${
        horoscope.sign.charAt(0).toUpperCase() + horoscope.sign.slice(1)
      } ${horoscope.period} Horoscope`,
      "description": horoscope.text.substring(0, 200),
      "datePublished": horoscope.date,
      "author": {
        "@type": "Organization",
        "name": "Stargram",
      },
      "publisher": {
        "@type": "Organization",
        "name": "Stargram",
        "url": "https://stargram.app",
      },
    }
    : null;

  // Combine schemas
  const structuredData = horoscopeSchema
    ? [organizationSchema, horoscopeSchema]
    : organizationSchema;

  return (
    <script type="application/ld+json">
      {JSON.stringify(structuredData, null, 2)}
    </script>
  );
}
