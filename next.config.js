// Pages that must never appear in search results
const NOINDEX_PATHS = [
  'moderationdashboard', 'supportagentdashboard', 'dashboard', 'customersupport',
  'paymentdashboard', 'paymenthistory', 'balance', 'tips', 'sendtip', 'monetization',
  'subscriptioninfo', 'performance', 'audiencedetails', 'showaudience', 'adsandboosts',
  'adsandboosts2', 'adsandboosts5', 'boostgoal', 'calltoaction', 'verrsasettings',
  'profilesetting', 'editprofileinformation', 'articlesettings', 'twofactorsetup',
  'resetpassword', 'setnewpassword', 'auth/callback', 'blockedusers',
  'blockedcommunities', 'recentlydeleted', 'restricted', 'bookmarks', 'notification',
  'verrsachat', 'individualchat',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      ...NOINDEX_PATHS.map((p) => ({
        source: `/${p}`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      })),
      {
        // iOS Universal Links: AASF must be served as application/json
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },

  async redirects() {
  return [
    {
      source: '/joinverrsanewsletter',
      destination: '/?scrollTo=newsletter',
      permanent: false,
    },
  ];
},

  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'ysmrnxmvuijzvdegfdmm.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60,
    formats: ['image/webp'],
  },
}

module.exports = nextConfig
