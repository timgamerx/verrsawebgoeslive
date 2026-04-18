// @ts-nocheck

import React, { useState } from "react";
import { IoCheckmarkCircle, IoHelpCircle, IoArrowForward } from "react-icons/io5";
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../components/SEO';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const features = [
    {
      title: "Post your articles easily",
      desc: "Publish your articles on Verrsa and let your pen do the talking while you earn real money.",
      img: "./post.jpg",
    },
    {
      title: "Earn from your contents",
      desc: "Create content, monetize and promote your contents, achieve a milestone and start earning.",
      img: "./earn.jpg",
    },
    {
      title: "Connect with likeminds",
      desc: "Verrsa gives you quick access to like minds and enable you communicate efficiently.",
      img: "./connect.jpg",
    },
    {
      title: "Upload your podcasts",
      desc: "Our amazing features include uploading or hosting a podcast, talk show, etc.",
      img: "./podcast.jpg",
    },
    {
      title: "Keep track of your content",
      desc: "Monetize, promote, and keep track of your content progress on Verrsa.",
      img: "./track.jpg",
    },
  ];

  const faqs = [
    {
      question: "How can small creators earn without a large audience?",
      answer:
        "Verrsa enables creators to monetize from day one through gift-based monetization, article payments, and live stream donations. You don't need 1,000 subscribers or followers to start earning. Every piece of content you create can generate income immediately.",
    },
    {
      question: "What percentage do creators earn from gifts?",
      answer:
        "Creators on Verrsa keep up to 80% of earnings from gifts and donations, with transparent payment processing. We believe in fair compensation for creators, which is why we maintain one of the highest creator revenue shares in the industry.",
    },
    {
      question: "Is Verrsa available globally?",
      answer:
        "Verrsa is a global platform available to creators everywhere. Creators can make payments and receive earnings seamlessly, with support for local payment methods that make transacting easy no matter where you are.",
    },
    {
      question: "How is Verrsa different from YouTube or TikTok?",
      answer:
        "Unlike YouTube's 1,000 subscriber and 4,000 watch hour requirements or TikTok's complex Creator Fund criteria, Verrsa lets creators earn immediately through direct payments, gifts, and content monetization with no minimum audience requirement. We're built specifically for emerging creators.",
    },
    {
      question: "What types of content can I create on Verrsa?",
      answer:
        "Verrsa supports articles, podcasts, live streaming, video content, and community posts. All content types can be monetized from day one, giving you multiple ways to earn and grow your audience.",
    },
    {
      question: "How quickly can I start earning on Verrsa?",
      answer:
        "You can start earning immediately after creating your first content. There's no waiting period, no minimum follower count, and no complex approval process. Just create, publish, and earn.",
    },
    {
      question: "Does Verrsa work for micro-influencers?",
      answer:
        "Absolutely. Verrsa is designed specifically for micro-influencers and emerging creators. Whether you have 10 followers or 10,000, you can monetize your content effectively. Our platform values quality engagement over audience size.",
    },
    {
      question: "What payment methods does Verrsa support?",
      answer:
        "Verrsa supports multiple payment methods including bank transfers, mobile money, and digital wallets. We're constantly expanding our payment options to serve creators globally, with special focus on emerging markets.",
    },
  ];

  const comparisons = [
    {
      platform: "YouTube",
      requirement: "1,000 subscribers + 4,000 watch hours",
      verrsaAdvantage: "No minimum audience required",
    },
    {
      platform: "TikTok",
      requirement: "10,000 followers for Creator Fund",
      verrsaAdvantage: "Earn from your first follower",
    },
    {
      platform: "Patreon",
      requirement: "Need existing audience elsewhere",
      verrsaAdvantage: "Built-in audience discovery",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address");
      return;
    }

    try {
      const res = await fetch("https://www.verrsa.org/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setSubmitted(true);
      alert("Thank you for subscribing!");
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      alert("Failed to subscribe. Please try again.");
    }
  };

  return (
    <>
      <SEO
        title="Verrsa - Write, Post, Live, Earn | Monetization-First Creator Platform"
        description="Join Verrsa, the monetization-first creator platform for emerging creators. Start earning from articles, podcasts, videos, and live streams without needing a large audience. No minimum followers required."
        keywords="creator platform, monetization, earn money online, articles, podcasts, live streaming, content creation, emerging creators, micro-influencers, social media, Verrsa"
        url="https://verrsa.org"
        type="website"
        image="https://ik.imagekit.io/te9biwxvl/verrsa-team.png"
      />
      <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img
          src="/verrsa-logo.png"
          alt="Verrsa"
          style={styles.logo}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <button style={styles.signInButton} onClick={() => router.push('/auth')}>
          <span style={styles.signInButtonText}>Sign In</span>
        </button>
      </div>

      {/* Hero Section */}
      <div style={styles.heroSection}>
        <div style={styles.badge}>
          <span style={styles.badgeText}>
            Application is now live on App Store, coming soon on Playstore
          </span>
        </div>

        <div style={styles.appStoreBadges}>
          <a
            href="https://apps.apple.com/us/app/verrsa/id6756518229"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://ik.imagekit.io/te9biwxvl/app-store.png"
              alt="Download on App Store"
              style={{ ...styles.appStoreBadge, marginTop: "-2px" }}
            />
          </a>
          <a
            href="https://play.google.com/store/apps/verrsa"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Get it on Google Play"
              style={styles.playStoreBadge}
            />
          </a>
        </div>

        <h1 style={styles.heroTitle}>Create, Publish, Go Live, and Earn</h1>
        <p style={styles.heroSubtitle}>
          Verrsa is a monetization-first creator platform for emerging creators.
          Start earning from articles, podcasts, videos and live streams without
          needing a large audience.
        </p>

        {/* CTA Buttons */}
        <div style={styles.ctaContainer}>
          <button style={styles.primaryCta} onClick={() => router.push('/auth')}>
            <span style={styles.primaryCtaText}>Get Started</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div style={styles.statsSection}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>80%</span>
          <span style={styles.statLabel}>Revenue Share</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>$0</span>
          <span style={styles.statLabel}>Min. to Start</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>Day 1</span>
          <span style={styles.statLabel}>Start Earning</span>
        </div>
      </div>

      {/* What is Verrsa Section */}
      <div style={styles.contentSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>ABOUT VERRSA</span>
        </div>
        <h2 style={styles.sectionTitle}>What is Verrsa?</h2>
        <p style={styles.sectionText}>
          Verrsa is a monetization-first creator platform for emerging creators.
          Unlike traditional platforms that require thousands of followers before
          you can earn, Verrsa lets you monetize from day one.
        </p>
        <p style={styles.sectionText}>
          We're an all-in-one platform for writing, podcasting, live streaming,
          and video content. Whether you're publishing articles, hosting podcasts,
          or going live, every piece of content can generate income immediately.
        </p>
        <p style={styles.sectionText}>
          Built for creators globally. Verrsa provides localized payment options
          and features designed to help creators succeed without needing a massive
          audience.
        </p>
      </div>

      {/* Who is Verrsa for Section */}
      <div style={styles.contentSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>FOR CREATORS</span>
        </div>
        <h2 style={styles.sectionTitle}>Who is Verrsa for?</h2>
        <div style={styles.audienceList}>
          <div style={styles.audienceItem}>
            <div style={styles.iconCircle}>
              <IoCheckmarkCircle size={24} color="#0EA5E9" />
            </div>
            <p style={styles.audienceText}>
              <strong style={styles.audienceBold}>Creators</strong> who want to
              monetize without 1,000 subscribers
            </p>
          </div>
          <div style={styles.audienceItem}>
            <div style={styles.iconCircle}>
              <IoCheckmarkCircle size={24} color="#0EA5E9" />
            </div>
            <p style={styles.audienceText}>
              <strong style={styles.audienceBold}>Micro-Influencers</strong>{" "}
              looking for fair revenue sharing and direct payments
            </p>
          </div>
          <div style={styles.audienceItem}>
            <div style={styles.iconCircle}>
              <IoCheckmarkCircle size={24} color="#0EA5E9" />
            </div>
            <p style={styles.audienceText}>
              <strong style={styles.audienceBold}>Creators</strong> needing
              localized payment methods and regional support
            </p>
          </div>
          <div style={styles.audienceItem}>
            <div style={styles.iconCircle}>
              <IoCheckmarkCircle size={24} color="#0EA5E9" />
            </div>
            <p style={styles.audienceText}>
              <strong style={styles.audienceBold}>Writers & Podcasters</strong>{" "}
              who want to earn from articles and audio content
            </p>
          </div>
          <div style={styles.audienceItem}>
            <div style={styles.iconCircle}>
              <IoCheckmarkCircle size={24} color="#0EA5E9" />
            </div>
            <p style={styles.audienceText}>
              <strong style={styles.audienceBold}>Live Streamers</strong> seeking
              gift-based monetization and real-time earnings
            </p>
          </div>
        </div>
      </div>

      {/* How Verrsa Works Section */}
      <div style={styles.contentSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>HOW IT WORKS</span>
        </div>
        <h2 style={styles.sectionTitle}>How Does Verrsa Monetization Work?</h2>
        <div style={styles.stepsList}>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>
              <span style={styles.stepNumberText}>1</span>
            </div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Create Your Content</h3>
              <p style={styles.stepDesc}>
                Publish articles, upload podcasts, or go live. All content types
                are monetizable from the start.
              </p>
            </div>
          </div>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>
              <span style={styles.stepNumberText}>2</span>
            </div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Earn Immediately</h3>
              <p style={styles.stepDesc}>
                Receive gifts during live streams, earn from article views, and
                get direct support from your audience. No minimum followers
                needed.
              </p>
            </div>
          </div>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>
              <span style={styles.stepNumberText}>3</span>
            </div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Keep 80% of Earnings</h3>
              <p style={styles.stepDesc}>
                Verrsa creators keep up to 80% of their earnings. We believe in
                fair compensation for your work.
              </p>
            </div>
          </div>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>
              <span style={styles.stepNumberText}>4</span>
            </div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Withdraw Anytime</h3>
              <p style={styles.stepDesc}>
                Get your earnings through bank transfer, mobile money, or digital
                wallets with flexible withdrawal options.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div style={styles.contentSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>COMPARISON</span>
        </div>
        <h2 style={styles.sectionTitle}>Verrsa vs Other Platforms</h2>
        <p style={styles.sectionSubtext}>
          See how Verrsa compares to other creator platforms when it comes to
          monetization requirements:
        </p>
        <div style={styles.comparisonTable}>
          {comparisons.map((comp, idx) => (
            <div key={idx} style={styles.comparisonRow}>
              <div style={styles.comparisonPlatform}>
                <span style={styles.comparisonPlatformName}>
                  {comp.platform}
                </span>
                <span style={styles.comparisonRequirement}>
                  {comp.requirement}
                </span>
              </div>
              <IoArrowForward size={20} color="#0EA5E9" style={styles.comparisonArrow} />
              <div style={styles.comparisonVerrsa}>
                <div style={styles.comparisonVerrsaBadge}>
                  <span style={styles.comparisonVerrsaLabel}>Verrsa</span>
                </div>
                <span style={styles.comparisonAdvantage}>
                  {comp.verrsaAdvantage}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div style={styles.featuresSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>FEATURES</span>
        </div>
        <h2 style={styles.sectionTitle}>Everything You Need to Succeed</h2>
        <div style={styles.featuresScroll}>
          {features.map((feature, idx) => (
            <div key={idx} style={styles.featureCard}>
              <img src={feature.img} alt={feature.title} style={styles.featureImage} />
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div style={styles.faqSection}>
        <div style={styles.sectionBadge}>
          <span style={styles.sectionBadgeText}>FAQ</span>
        </div>
        <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
        <p style={styles.sectionSubtext}>
          Everything you need to know about monetizing your content on Verrsa
        </p>
        {faqs.map((faq, idx) => (
          <div key={idx} style={styles.faqItem}>
            <div style={styles.faqQuestion}>
              <IoHelpCircle size={22} color="#0EA5E9" />
              <h3 style={styles.faqQuestionText}>{faq.question}</h3>
            </div>
            <p style={styles.faqAnswer}>{faq.answer}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLinks}>

         
          <Link href="/terms" style={styles.footerLink}>
            Terms of Service
          </Link>
          <Link href="/privacy" style={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link href="/community-guidelines" style={styles.footerLink}>
            Community Guidelines
          </Link>
          <a href="mailto:hello@verrsa.org" style={styles.footerLink}>
            Contact Us
          </a>
        </div>
        <p style={styles.copyright}>
          © {new Date().getFullYear()} Verrsa. All rights reserved.
        </p>
      </div>
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#FFFFFF",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dcf6ff",
    padding: "20px 40px",
    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
    position: "sticky",
    top: 0,
    marginBottom: 0,
    zIndex: 100,
  },
  logo: {
    width: "100px",
    height: "35px",
    objectFit: "contain",
  },
  signInButton: {
     backgroundColor: "#00bfff",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
    transition: "all 0.2s ease",
  },
  signInButtonText: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: "500",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  heroSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#dcf6ff",
    padding: "80px 20px",
  },
  badge: {
    backgroundColor: "#F0F9FF",
    border: "1px solid #BAE6FD",
    borderRadius: "9999px",
    padding: "8px 20px",
    marginBottom: "32px",
    boxShadow: "0 2px 8px rgba(14, 165, 233, 0.1)",
  },
  badgeText: {
    fontSize: "15px",
    fontWeight: "400",
    color: "#0369A1",
    textAlign: "center",
    letterSpacing: "0.1px",
  },
  appStoreBadges: {
    display: "flex",
    gap: "16px",
    marginBottom: "44px",
  },
  appStoreBadge: {
    width: "153px",
    height: "55px",
    borderRadius: "8px",

  },
  playStoreBadge: {
    width: "153px",
    height: "50px",
    borderRadius: "8px",
  },
  heroTitle: {
    fontSize: "64px",
    fontWeight: "600",
    color: "#0F172A",
    maxWidth: "900px",
    textAlign: "center",
    marginBottom: "20px",
    letterSpacing: "-1.5px",
    lineHeight: "72px",
  },
  heroSubtitle: {
    fontSize: "20px",
    fontWeight: "300",
    color: "#475569",
    textAlign: "center",
    maxWidth: "750px",
    lineHeight: "32px",
    marginBottom: "48px",
  },
  ctaContainer: {
    display: "flex",
    gap: "16px",
    marginTop: "8px",
  },
  primaryCta: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px 32px",
    borderRadius: "12px",
    backgroundColor: "#00bfff",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(14, 165, 233, 0.3)",
    transition: "all 0.2s ease",
  },
  primaryCtaText: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: "500",
    letterSpacing: "0.2px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  statsSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: "48px 40px",
    padding: "32px",
    borderRadius: "24px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(14, 165, 233, 0.1)",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: "48px",
    fontWeight: "600",
    color: "#0EA5E9",
    letterSpacing: "-1px",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
  },
  statDivider: {
    width: "1px",
    height: "40px",
    backgroundColor: "#E2E8F0",
  },
  contentSection: {
    backgroundColor: "#FFFFFF",
    margin: "0 40px 32px",
    padding: "48px",
    borderRadius: "24px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
    border: "1px solid rgba(0, 0, 0, 0.04)",
  },
  sectionBadge: {
    margin: "0 auto 16px",
    backgroundColor: "#F0F9FF",
    padding: "8px 16px",
    borderRadius: "20px",
    border: "1px solid #BAE6FD",
    textAlign: "center",
    width: "fit-content",
    display: "flex",
    justifyContent: "center",
  },
  sectionBadgeText: {
    fontSize: "11px",
    fontWeight: "400",
    color: "#0284C7",
    letterSpacing: "1.2px",
  },
  sectionTitle: {
    fontSize: "36px",
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: "20px",
    letterSpacing: "-1px",
    textAlign: "center",
  },
  sectionSubtext: {
    fontSize: "15px",
    color: "#64748B",
    textAlign: "center",
    marginBottom: "32px",
    lineHeight: "26px",
    maxWidth: "600px",
    margin: "0 auto 32px",
  },
  sectionText: {
    fontSize: "15px",
    color: "#475569",
    lineHeight: "28px",
    marginBottom: "16px",
    textAlign: "center",
    maxWidth: "700px",
    margin: "0 auto 16px",
  },
  audienceList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "8px",
  },
  audienceItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    backgroundColor: "#F8FAFC",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid #E2E8F0",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    backgroundColor: "#E0F2FE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  audienceText: {
    flex: 1,
    fontSize: "15px",
    color: "#475569",
    lineHeight: "24px",
    margin: 0,
  },
  audienceBold: {
    fontWeight: "600",
    color: "#0F172A",
  },
  stepsList: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    marginTop: "8px",
  },
  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
  },
  stepNumber: {
    width: "48px",
    height: "48px",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
    boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: "20px",
    fontWeight: "400",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: "8px",
    letterSpacing: "-0.3px",
    margin: "0 0 8px 0",
  },
  stepDesc: {
    fontSize: "15px",
    color: "#64748B",
    lineHeight: "24px",
    margin: 0,
  },
  comparisonTable: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "8px",
  },
  comparisonRow: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: "20px",
    borderRadius: "16px",
    gap: "16px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
  },
  comparisonPlatform: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  comparisonPlatformName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: "8px",
    display: "block",
  },
  comparisonRequirement: {
    fontSize: "13px",
    color: "#000",
    lineHeight: "18px",
    display: "block",
  },
  comparisonArrow: {
    margin: "0 8px",
    flexShrink: 0,
  },
  comparisonVerrsa: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  comparisonVerrsaBadge: {
    padding: "4px 12px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    width: "fit-content",
    marginBottom: "8px",
  },
  comparisonVerrsaLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0369A1",
    letterSpacing: "0.1px",
  },
  comparisonAdvantage: {
    fontSize: "14px",
    color: "#059669",
    fontWeight: "400",
    lineHeight: "20px",
  },
  featuresSection: {
    marginBottom: "80px",
    padding: "0 40px",
  },
  featuresScroll: {
    display: "flex",
    gap: "24px",
    overflowX: "auto",
    padding: "8px 0 16px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    minWidth: "340px",
    maxWidth: "340px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  featureImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    backgroundColor: "#F1F5F9",
  },
  featureTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: "12px",
    letterSpacing: "-0.5px",
    padding: "20px 20px 0",
    margin: "0 0 12px 0",
  },
  featureDesc: {
    fontSize: "14px",
    color: "#64748B",
    lineHeight: "22px",
    padding: "0 20px 20px",
    margin: 0,
  },
  faqSection: {
    margin: "0 40px 80px",
    padding: "48px",
    backgroundColor: "#FFFFFF",
    borderRadius: "24px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
    border: "1px solid rgba(0, 0, 0, 0.04)",
  },
  faqItem: {
    marginBottom: "32px",
    paddingBottom: "32px",
    borderBottom: "1px solid #F1F5F9",
  },
  faqQuestion: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "16px",
  },
  faqQuestionText: {
    flex: 1,
    fontSize: "18px",
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: "26px",
    margin: 0,
  },
  faqAnswer: {
    fontSize: "15px",
    color: "#64748B",
    lineHeight: "26px",
    paddingLeft: "38px",
    margin: 0,
  },
  footer: {
    backgroundColor: "#F8FAFC",
    borderTop: "1px solid #E2E8F0",
    padding: "48px 20px",
    marginTop: "48px",
  },
  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "32px",
    marginBottom: "24px",
  },
  footerLink: {
    fontSize: "14px",
    color: "#475569",
    textDecoration: "none",
    transition: "color 0.2s ease",
  },
  copyright: {
    fontSize: "13px",
    color: "#94A3B8",
    textAlign: "center",
    margin: 0,
  },
};
