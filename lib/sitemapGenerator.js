/**
 * Sitemap Generator Utility
 * Generates dynamic sitemaps for articles, podcasts, users, and communities
 * These should be called by serverless functions or build scripts
 */

import { supabase } from '../components/supabase';

/**
 * Generate XML sitemap header
 */
function generateSitemapHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
}

/**
 * Generate XML sitemap footer
 */
function generateSitemapFooter() {
  return `</urlset>`;
}

/**
 * Generate a single URL entry
 */
function generateUrlEntry({ loc, lastmod, changefreq, priority, images = [] }) {
  const date = lastmod ? new Date(lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  let entry = `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${changefreq || 'weekly'}</changefreq>
    <priority>${priority || '0.5'}</priority>`;

  // Add image entries if provided
  if (images.length > 0) {
    images.forEach(img => {
      entry += `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      ${img.title ? `<image:title>${escapeXml(img.title)}</image:title>` : ''}
      ${img.caption ? `<image:caption>${escapeXml(img.caption)}</image:caption>` : ''}
    </image:image>`;
    });
  }

  entry += `
  </url>`;
  
  return entry;
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Articles Sitemap
 */
export async function generateArticlesSitemap() {
  try {
    const { data: articles, error } = await supabase
      .from('posts')
      .select('id, title, content, image_url, created_at, updated_at')
      .eq('post_type', 'article')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(5000); // Google recommends max 50,000 URLs per sitemap

    if (error) throw error;

    let sitemap = generateSitemapHeader();

    articles?.forEach(article => {
      const images = article.image_url ? [{ url: article.image_url, title: article.title }] : [];
      
      sitemap += generateUrlEntry({
        loc: `https://verrsa.org/article/${article.id}`,
        lastmod: article.updated_at || article.created_at,
        changefreq: 'weekly',
        priority: '0.8',
        images,
      });
    });

    sitemap += generateSitemapFooter();
    return sitemap;
  } catch (error) {
    console.error('Error generating articles sitemap:', error);
    return null;
  }
}

/**
 * Generate Podcasts Sitemap
 */
export async function generatePodcastsSitemap() {
  try {
    const { data: podcasts, error } = await supabase
      .from('posts')
      .select('id, title, content, image_url, created_at, updated_at')
      .eq('post_type', 'podcast')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    let sitemap = generateSitemapHeader();

    podcasts?.forEach(podcast => {
      const images = podcast.image_url ? [{ url: podcast.image_url, title: podcast.title }] : [];
      
      sitemap += generateUrlEntry({
        loc: `https://verrsa.org/podcast/${podcast.id}`,
        lastmod: podcast.updated_at || podcast.created_at,
        changefreq: 'weekly',
        priority: '0.8',
        images,
      });
    });

    sitemap += generateSitemapFooter();
    return sitemap;
  } catch (error) {
    console.error('Error generating podcasts sitemap:', error);
    return null;
  }
}

/**
 * Generate Users/Profiles Sitemap
 */
export async function generateUsersSitemap() {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, updated_at')
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10000);

    if (error) throw error;

    let sitemap = generateSitemapHeader();

    users?.forEach(user => {
      const images = user.avatar_url ? [{ url: user.avatar_url, title: user.username }] : [];
      
      sitemap += generateUrlEntry({
        loc: `https://verrsa.org/user/${user.id}`,
        lastmod: user.updated_at,
        changefreq: 'daily',
        priority: '0.6',
        images,
      });
    });

    sitemap += generateSitemapFooter();
    return sitemap;
  } catch (error) {
    console.error('Error generating users sitemap:', error);
    return null;
  }
}

/**
 * Generate Communities Sitemap
 */
export async function generateCommunitiesSitemap() {
  try {
    const { data: communities, error } = await supabase
      .from('communities')
      .select('id, name, description, image_url, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    let sitemap = generateSitemapHeader();

    communities?.forEach(community => {
      const images = community.image_url ? [{ url: community.image_url, title: community.name }] : [];
      
      sitemap += generateUrlEntry({
        loc: `https://verrsa.org/community/${community.id}`,
        lastmod: community.updated_at || community.created_at,
        changefreq: 'daily',
        priority: '0.7',
        images,
      });
    });

    sitemap += generateSitemapFooter();
    return sitemap;
  } catch (error) {
    console.error('Error generating communities sitemap:', error);
    return null;
  }
}

/**
 * Generate Sitemap Index (list of all sitemaps)
 */
export function generateSitemapIndex() {
  const now = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://verrsa.org/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://verrsa.org/sitemap-articles.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://verrsa.org/sitemap-podcasts.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://verrsa.org/sitemap-users.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://verrsa.org/sitemap-communities.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Example usage in a serverless function or build script:
 * 
 * export async function handler(event, context) {
 *   const articlesXml = await generateArticlesSitemap();
 *   const podcastsXml = await generatePodcastsSitemap();
 *   const usersXml = await generateUsersSitemap();
 *   const communitiesXml = await generateCommunitiesSitemap();
 *   
 *   // Save to public folder or return as response
 *   return {
 *     statusCode: 200,
 *     headers: { 'Content-Type': 'application/xml' },
 *     body: articlesXml,
 *   };
 * }
 */
