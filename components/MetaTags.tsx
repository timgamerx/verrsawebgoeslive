// @ts-nocheck
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.other';
  video?: string;
  siteName?: string;
}

export default function MetaTags({
  title = 'Verrsa - Write, Post, Live, Earn',
  description = 'Monetization-first creator platform for emerging creators. Write. Post. Go live. Monetize. All in one place.',
  image = 'https://ik.imagekit.io/te9biwxvl/verrsa-team.png',
  url = 'https://verrsa.org',
  type = 'website',
  video,
  siteName = 'Verrsa',
}: MetaTagsProps) {
  const fullUrl = url.startsWith('http') ? url : `https://verrsa.org${url}`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook / WhatsApp / LinkedIn */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      
      {video && (
        <>
          <meta property="og:video" content={video} />
          <meta property="og:video:secure_url" content={video} />
          <meta property="og:video:type" content="video/mp4" />
        </>
      )}

      {/* Twitter */}
      <meta property="twitter:card" content={video ? "player" : "summary_large_image"} />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {video && (
        <>
          <meta property="twitter:player" content={video} />
          <meta property="twitter:player:stream" content={video} />
          <meta property="twitter:player:stream:content_type" content="video/mp4" />
        </>
      )}
    </Helmet>
  );
}

// Helper function to truncate text for meta descriptions
export function truncateText(text: string, maxLength: number = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Helper to generate post URLs
export function getPostUrl(postType: string, postId: string): string {
  const baseUrl = 'https://verrsa.org';
  switch (postType) {
    case 'article':
      return `${baseUrl}/article/${postId}`;
    case 'podcast':
      return `${baseUrl}/podcast/${postId}`;
    case 'video':
      return `${baseUrl}/reel/${postId}`;
    case 'verse':
      return `${baseUrl}/verse/${postId}`;
    case 'community':
      return `${baseUrl}/community/${postId}`;
    case 'communitypost':
      return `${baseUrl}/community-posts/${postId}`;
    default:
      return `${baseUrl}/post/${postId}`;
  }
}
