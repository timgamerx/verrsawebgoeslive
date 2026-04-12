/**
 * Serverless Function for Dynamic Sitemap Generation
 * Deploy this to Vercel, Netlify, or similar platforms
 * Example: /api/sitemap-articles
 */

import {
  generateArticlesSitemap,
  generatePodcastsSitemap,
  generateUsersSitemap,
  generateCommunitiesSitemap,
  generateSitemapIndex,
} from '../../lib/sitemapGenerator';

/**
 * Generate Articles Sitemap
 * GET /api/sitemap-articles
 */
export async function articlesHandler(req, res) {
  try {
    const sitemap = await generateArticlesSitemap();
    
    if (!sitemap) {
      return res.status(500).send('Error generating sitemap');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generate Podcasts Sitemap
 * GET /api/sitemap-podcasts
 */
export async function podcastsHandler(req, res) {
  try {
    const sitemap = await generatePodcastsSitemap();
    
    if (!sitemap) {
      return res.status(500).send('Error generating sitemap');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generate Users Sitemap
 * GET /api/sitemap-users
 */
export async function usersHandler(req, res) {
  try {
    const sitemap = await generateUsersSitemap();
    
    if (!sitemap) {
      return res.status(500).send('Error generating sitemap');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generate Communities Sitemap
 * GET /api/sitemap-communities
 */
export async function communitiesHandler(req, res) {
  try {
    const sitemap = await generateCommunitiesSitemap();
    
    if (!sitemap) {
      return res.status(500).send('Error generating sitemap');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generate Sitemap Index
 * GET /api/sitemap
 */
export async function indexHandler(req, res) {
  try {
    const sitemap = generateSitemapIndex();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}

// Export handlers based on your platform
// For Vercel:
export default function handler(req, res) {
  const { type } = req.query;
  
  switch (type) {
    case 'articles':
      return articlesHandler(req, res);
    case 'podcasts':
      return podcastsHandler(req, res);
    case 'users':
      return usersHandler(req, res);
    case 'communities':
      return communitiesHandler(req, res);
    case 'index':
    default:
      return indexHandler(req, res);
  }
}
