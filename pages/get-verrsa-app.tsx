import type { GetServerSideProps } from 'next';

const APP_STORE_URL = 'https://apps.apple.com/app/id6756518229';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.verrsaapp.verrsa';
// Desktop / unknown devices land on the existing download page
const FALLBACK_URL = '/app-download';

/**
 * Smart link for TikTok Ads: https://www.verrsa.org/get-verrsa-app
 * iPhone/iPad -> App Store, Android -> Google Play, others -> /app-download
 */
export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  const ua = req.headers['user-agent'] || '';
  let destination = FALLBACK_URL;

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const source = first(query.utm_source);
  const medium = first(query.utm_medium);
  const campaign = first(query.utm_campaign);

  if (/iPad|iPhone|iPod/i.test(ua)) {
    destination = APP_STORE_URL;
    // App Store campaign token (App Store Connect > App Analytics).
    // Only reported by Apple if a provider token (pt) is also added.
    if (campaign) destination += `?ct=${encodeURIComponent(campaign.slice(0, 40))}`;
  } else if (/android/i.test(ua)) {
    destination = PLAY_STORE_URL;
    // Google Play install referrer: visible in Play Console and to the app
    const referrer = new URLSearchParams();
    if (source) referrer.set('utm_source', source);
    if (medium) referrer.set('utm_medium', medium);
    if (campaign) referrer.set('utm_campaign', campaign);
    const r = referrer.toString();
    if (r) destination += `&referrer=${encodeURIComponent(r)}`;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return { redirect: { destination, permanent: false } };
};

export default function GetApp() {
  return null;
}
