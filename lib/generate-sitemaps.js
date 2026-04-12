/**
 * Build-time Sitemap Generation Script
 * Run this during your build process to generate static sitemaps
 * 
 * Usage: node scripts/generate-sitemaps.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports (adjust paths based on your setup)
import('../src/utils/sitemapGenerator.js').then(async (module) => {
  const {
    generateArticlesSitemap,
    generatePodcastsSitemap,
    generateUsersSitemap,
    generateCommunitiesSitemap,
    generateSitemapIndex,
  } = module;

  const publicDir = path.join(__dirname, '..', 'public');

  console.log('🚀 Starting sitemap generation...\n');

  try {
    // Generate Articles Sitemap
    console.log('📝 Generating articles sitemap...');
    const articles = await generateArticlesSitemap();
    if (articles) {
      fs.writeFileSync(path.join(publicDir, 'sitemap-articles.xml'), articles);
      console.log('✅ Articles sitemap generated');
    } else {
      console.log('⚠️  Articles sitemap generation skipped (no data or error)');
    }

    // Generate Podcasts Sitemap
    console.log('🎙️  Generating podcasts sitemap...');
    const podcasts = await generatePodcastsSitemap();
    if (podcasts) {
      fs.writeFileSync(path.join(publicDir, 'sitemap-podcasts.xml'), podcasts);
      console.log('✅ Podcasts sitemap generated');
    } else {
      console.log('⚠️  Podcasts sitemap generation skipped (no data or error)');
    }

    // Generate Users Sitemap
    console.log('👥 Generating users sitemap...');
    const users = await generateUsersSitemap();
    if (users) {
      fs.writeFileSync(path.join(publicDir, 'sitemap-users.xml'), users);
      console.log('✅ Users sitemap generated');
    } else {
      console.log('⚠️  Users sitemap generation skipped (no data or error)');
    }

    // Generate Communities Sitemap
    console.log('🏘️  Generating communities sitemap...');
    const communities = await generateCommunitiesSitemap();
    if (communities) {
      fs.writeFileSync(path.join(publicDir, 'sitemap-communities.xml'), communities);
      console.log('✅ Communities sitemap generated');
    } else {
      console.log('⚠️  Communities sitemap generation skipped (no data or error)');
    }

    // Generate Sitemap Index
    console.log('📋 Generating sitemap index...');
    const index = generateSitemapIndex();
    fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), index);
    console.log('✅ Sitemap index generated');

    console.log('\n🎉 All sitemaps generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - public/sitemap-articles.xml');
    console.log('  - public/sitemap-podcasts.xml');
    console.log('  - public/sitemap-users.xml');
    console.log('  - public/sitemap-communities.xml');
    console.log('  - public/sitemap-index.xml');
    console.log('\nDon\'t forget to submit to Google Search Console!');
    
  } catch (error) {
    console.error('❌ Error generating sitemaps:', error);
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Failed to load sitemap generator:', error);
  process.exit(1);
});
