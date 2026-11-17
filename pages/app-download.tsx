import React, { useState } from 'react';
import Head from 'next/head';

const APP_STORE_URL = 'https://apps.apple.com/us/app/verrsa/id6756518229';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.verrsaapp.verrsa';
const OG_IMAGE =
  'https://ysmrnxmvuijzvdegfdmm.supabase.co/storage/v1/object/public/media-public/og-images/verrsa-creators.jpg';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verrsa',
  url: 'https://www.verrsa.org',
  logo: OG_IMAGE,
  description:
    'Verrsa is a monetization-first creator platform for emerging creators, enabling content monetization without large audiences.',
  foundingDate: '2025',
  sameAs: ['https://twitter.com/verrsa', 'https://www.linkedin.com/company/verrsa'],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@verrsa.org',
    contactType: 'Customer Support',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How can small creators earn without a large audience?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Verrsa enables creators to monetize from day one through gift-based monetization, article payments, and live stream donations. You don't need 1,000 subscribers or followers to start earning.",
      },
    },
    {
      '@type': 'Question',
      name: 'What percentage do creators earn from gifts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Creators on Verrsa keep up to 80% of earnings from gifts and donations, with transparent payment processing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Verrsa available globally?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Verrsa is available globally, supporting creators everywhere with localized payment options and features tailored to their needs.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is Verrsa different from YouTube or TikTok?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Unlike YouTube's 1,000 subscriber requirement or TikTok's complex monetization criteria, Verrsa lets creators earn immediately through direct payments, gifts, and content monetization with no minimum audience requirement.",
      },
    },
  ],
};

const AppleIcon = () => (
  <svg viewBox="0 0 384 512" aria-hidden="true" style={styles.icon}>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 512 512" aria-hidden="true" style={styles.icon}>
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
  </svg>
);

export default function AppDownloadPage() {
  const [hovered, setHovered] = useState<'ios' | 'android' | null>(null);

  return (
    <>
      <Head>
        <title>Verrsa | Earn Without 1000 Subscribers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Verrsa is a creator platform for content creation and community building. Create and publish articles, podcasts, videos and posts, connect with communities, go live, grow your audience and monetize your creativity."
        />
        <meta
          name="keywords"
          content="content creation, communities, community building, streaming, live streaming, live streaming platform, live streaming platforms, earn from videos, post videos, earn from videos, publish podcasts, earn from podcasts, write articles, earn from articles, creator monetization, creator platform, monetize without subscribers, live streaming Africa, creator earnings, YouTube alternative, micro influencer tools, gift-based monetization, emerging creators, creator platform Africa"
        />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Verrsa | Earn Without 1000 Subscribers"
        />
        <meta
          property="og:description"
          content="Verrsa is a creator platform for content creation and community building. Create and publish articles, podcasts, videos and posts, connect with communities, go live, grow your audience and monetize your creativity."
        />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.verrsa.org" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Verrsa | Earn Without 1000 Subscribers"
        />
        <meta
          name="twitter:description"
          content="Start earning from articles, podcasts, and live streams without needing a large audience."
        />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </Head>

      <main style={styles.page}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo4.png" alt="Verrsa Logo" style={styles.logo} />

        <h1 style={styles.title}>Create, Publish, Live, and Earn</h1>
        <p style={styles.subtitle}>
          Content creation and community. Built for creators | Understand your
          audience and monetize your creativity. Join Verrsa ↓
        </p>

        <div style={styles.buttons}>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.button,
              ...styles.darkButton,
              ...(hovered === "ios" ? styles.buttonHover : {}),
            }}
            onMouseEnter={() => setHovered("ios")}
            onMouseLeave={() => setHovered(null)}
          >
            <AppleIcon />
            <span>Download on the App Store</span>
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.button,
              ...(hovered === "android" ? styles.buttonHover : {}),
            }}
            onMouseEnter={() => setHovered("android")}
            onMouseLeave={() => setHovered(null)}
          >
            <PlayIcon />
            <span>Download on the Google Play Store</span>
          </a>
        </div>
      </main>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#ffffff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    boxSizing: 'border-box',
  },
  logo: {
    width: 140,
    height: 'auto',
    objectFit: 'contain',
    marginBottom: 32,
  },
  title: {
    fontSize: 'clamp(30px, 5vw, 40px)',
    fontWeight: 800,
    color: '#111827',
    lineHeight: 1.2,
    maxWidth: 640,
    margin: '0 0 16px',
  },
  subtitle: {
    fontSize: 'clamp(16px, 2.5vw, 18px)',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: 560,
    margin: '0 0 36px',
  },
  buttons: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 280,
    maxWidth: '100%',
    padding: '14px 28px',
    background: '#0ea5e9',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: 12,
    boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
    transition: 'transform 0.15s ease',
    boxSizing: 'border-box',
  },
  darkButton: {
    background: '#111827',
    boxShadow: '0 4px 14px rgba(17, 24, 39, 0.25)',
  },
  buttonHover: {
    transform: 'translateY(-2px)',
  },
  icon: {
    width: 22,
    height: 22,
    fill: 'currentColor',
    flexShrink: 0,
  },
};

