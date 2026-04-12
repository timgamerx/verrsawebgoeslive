import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for managing meta tags and structured data
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {string} props.keywords - Comma-separated keywords
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.url - Canonical URL
 * @param {string} props.type - Open Graph type (website, article, profile, etc.)
 * @param {string} props.author - Content author
 * @param {string} props.publishedTime - Publication date (ISO format)
 * @param {string} props.modifiedTime - Modification date (ISO format)
 * @param {Object} props.structuredData - JSON-LD structured data
 * @param {boolean} props.noindex - Prevent indexing
 */
export default function SEO({
  title = 'Verrsa - Write, Post, Live, Earn',
  description = 'Monetization-first creator platform for emerging creators. Write. Post. Go live. Monetize. All in one place.',
  keywords = 'Verrsa, social media, community, live stream, posts, videos, articles, podcasts, creator platform, monetization',
  image = 'https://ik.imagekit.io/te9biwxvl/verrsa-team.png',
  url = 'https://verrsa.org',
  type = 'website',
  author = 'Verrsa',
  publishedTime,
  modifiedTime,
  structuredData,
  noindex = false,
}) {
  const fullTitle = title.includes('Verrsa') ? title : `${title} | Verrsa`;

  // Default structured data for the organization
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Verrsa',
    url: 'https://verrsa.org',
    logo: 'https://verrsa.org/verrsa-logo.png',
    description: 'Monetization-first creator platform for emerging creators',
    sameAs: [
      'https://twitter.com/verrsa',
      'https://facebook.com/verrsa',
      'https://instagram.com/verrsa',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@verrsa.org',
    },
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}

      {/* Open Graph / Facebook / WhatsApp / LinkedIn */}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Verrsa" />
      <meta property="og:locale" content="en_US" />
      
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@verrsa" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#00BFFF" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Verrsa" />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>
    </Helmet>
  );
}

/**
 * Generate Article structured data
 */
export function generateArticleSchema({
  title,
  description,
  author,
  publishedDate,
  modifiedDate,
  image,
  url,
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Verrsa',
      logo: {
        '@type': 'ImageObject',
        url: 'https://verrsa.org/verrsa-logo.png',
      },
    },
    datePublished: publishedDate,
    dateModified: modifiedDate || publishedDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

/**
 * Generate Profile structured data
 */
export function generateProfileSchema({ name, username, bio, image, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: name,
      alternateName: username,
      description: bio,
      image: image,
      url: url,
    },
  };
}

/**
 * Generate Podcast Episode structured data
 */
export function generatePodcastSchema({
  title,
  description,
  author,
  publishedDate,
  audioUrl,
  duration,
  image,
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: title,
    description: description,
    author: {
      '@type': 'Person',
      name: author,
    },
    datePublished: publishedDate,
    associatedMedia: {
      '@type': 'MediaObject',
      contentUrl: audioUrl,
      duration: duration,
    },
    image: image,
  };
}

/**
 * Generate Video structured data
 */
export function generateVideoSchema({
  title,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: description,
    thumbnailUrl: thumbnailUrl,
    uploadDate: uploadDate,
    duration: duration,
    contentUrl: contentUrl,
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
