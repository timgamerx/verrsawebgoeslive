// @ts-nocheck

import React from "react";
import { useRouter } from 'next/router';
import { IoChevronBack } from "react-icons/io5";

export default function CommunityGuidelines() {
  const router = useRouter();
  
  return (
    <div style={styles.container}>

      <div style={styles.headerInfo}>
        <img
          src="/verrsa-logo.png"
          alt="Verrsa"
          style={styles.logo}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <button style={styles.signInButton} onClick={() => router.push('/auth')}>
          <span style={styles.signInButtonText}>Sign In</span>
        </button>
      </div>

      {/* Back Button */}
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <IoChevronBack size={28} color="black" />
      </button>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Community Guidelines</h1>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.section}>
          <p style={styles.lastUpdated}>Last updated: November 06, 2025</p>

          <p style={styles.introText}>
            Welcome to Verrsa! Our community is built on creativity, respect,
            and authenticity. These guidelines help ensure Verrsa remains a
            safe, inclusive space where creators can thrive and audiences can
            enjoy quality content.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>1. Be Respectful</h2>
          <p style={styles.sectionText}>
            Treat all members of the Verrsa community with respect and dignity.
          </p>
          <p style={styles.bulletText}>
            • No harassment, bullying, or hate speech
            <br />• Respect diverse perspectives and backgrounds
            <br />• Engage in constructive dialogue
            <br />• No personal attacks or doxxing
            <br />• Respect content creators' intellectual property
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>2. Create Original Content</h2>
          <p style={styles.sectionText}>
            Verrsa celebrates authentic creativity and original work.
          </p>
          <p style={styles.bulletText}>
            • Share only content you own or have rights to
            <br />• Give proper credit when using others' work
            <br />• No plagiarism or copyright infringement
            <br />• Be transparent about sponsored content
            <br />• Don't impersonate others
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>3. Keep It Safe</h2>
          <p style={styles.sectionText}>
            Help maintain a safe environment for all users.
          </p>
          <p style={styles.bulletText}>
            • No illegal content or activities
            <br />• No content promoting violence or harm
            <br />• No sexually explicit content
            <br />• No content exploiting minors
            <br />• No sharing of personal information without consent
            <br />• Report suspicious or harmful content
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>4. No Spam or Manipulation</h2>
          <p style={styles.sectionText}>
            Engage genuinely with the community.
          </p>
          <p style={styles.bulletText}>
            • No spam, scams, or fraudulent schemes
            <br />• Don't manipulate engagement metrics
            <br />• No fake accounts or automated bots
            <br />• No misleading clickbait content
            <br />• Don't abuse platform features
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>5. Content Quality Standards</h2>
          <p style={styles.sectionText}>
            Maintain high-quality standards for your content.
          </p>
          <p style={styles.bulletText}>
            • Ensure accuracy in factual content
            <br />• Label opinions clearly
            <br />• Use appropriate content warnings
            <br />• Categorize content correctly
            <br />• Maintain reasonable audio/video quality
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>5.1 Video Content on Verrsa</h2>
          <p style={styles.sectionText}>
            Verrsa is a creator-first platform focused on value, voice, and
            meaningful connection. Videos on Verrsa should inform, inspire, or
            spark thoughtful engagement—not just entertain.
          </p>

          <p style={styles.bulletText}>
            • Educational & insight videos (tutorials, how-tos, explainers, deep
            dives)
            <br />• Thought leadership and opinion-based content on culture,
            business, media, or society
            <br />• Podcast-style videos, including interviews, discussions, and
            community conversations
            <br />• Creator stories, journeys, behind-the-scenes, and real
            experiences
            <br />• Short-form videos focused on quick tips, highlights, or
            micro-lessons
            <br />• Community-driven videos such as Q&A responses and
            discussions
            <br />• Business and brand storytelling (product explainers, case
            studies, founder messages)
            <br />• Creative and expressive videos that communicate a clear idea
            or message
          </p>

          <p style={styles.sectionText}>
            Low-effort, misleading, or purely engagement-bait content may be
            limited or removed. Creators are encouraged to prioritize clarity,
            originality, and purpose in their videos.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>
            5.2 Go Live Content Standards
          </h2>
          <p style={styles.sectionText}>
            Go Live on Verrsa is designed for real-time connection, meaningful
            conversations, and creator-led experiences. Live sessions should
            provide value, encourage interaction, and foster healthy community
            engagement.
          </p>

          <p style={styles.bulletText}>
            • Live podcasts, interviews, and panel discussions
            <br />• Educational sessions, workshops, tutorials, and
            masterclasses
            <br />• Community discussions, Q&A sessions, and open conversations
            <br />• Creator storytelling, behind-the-scenes, and personal
            journeys
            <br />• Product walkthroughs, brand storytelling, and launches
            <br />• Live events hosted within creator communities
            <br />• Interactive sessions that encourage audience participation
            and feedback
          </p>

          <p style={styles.sectionText}>
            Live streams should remain respectful, purposeful, and aligned with
            Verrsa's community values. Repetitive, misleading, low-effort, or
            disruptive live content may be limited, ended, or removed.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>6. Monetization Guidelines</h2>
          <p style={styles.sectionText}>
            If you monetize your content, follow these rules:
          </p>
          <p style={styles.bulletText}>
            • Disclose sponsored content and partnerships
            <br />• Don't mislead about product features
            <br />• Follow advertising standards
            <br />• Don't promote prohibited products/services
            <br />• Respect subscriber/supporter expectations
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>7. Community Interactions</h2>
          <p style={styles.sectionText}>
            Foster positive interactions in comments and communities.
          </p>
          <p style={styles.bulletText}>
            • Keep discussions on-topic
            <br />• No trolling or inflammatory behavior
            <br />• Respect moderators' decisions
            <br />• Report violations appropriately
            <br />• Don't engage in brigading or coordinated harassment
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>8. Prohibited Content</h2>
          <p style={styles.sectionText}>
            The following content is strictly prohibited:
          </p>
          <p style={styles.bulletText}>
            • Terrorism, extremism, or violent organizations
            <br />• Child exploitation or endangerment
            <br />• Non-consensual intimate imagery
            <br />• Self-harm or suicide promotion
            <br />• Dangerous or illegal activities
            <br />• Sale of regulated goods or services
            <br />• Misinformation causing imminent harm
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>9. Enforcement</h2>
          <p style={styles.sectionText}>Violations may result in:</p>
          <p style={styles.bulletText}>
            • Content removal or demonetization
            <br />• Account warnings or restrictions
            <br />• Temporary or permanent suspension
            <br />• Loss of monetization privileges
            <br />• Legal action in severe cases
          </p>
          <p style={styles.sectionText}>
            We review reports thoroughly and apply penalties fairly. You can
            appeal enforcement decisions.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>10. Reporting Violations</h2>
          <p style={styles.sectionText}>
            If you encounter content that violates these guidelines:
          </p>
          <p style={styles.bulletText}>
            • Use the in-app report feature
            <br />• Provide specific details
            <br />• Don't engage with violating content
            <br />• Block users if needed
            <br />• For urgent safety concerns, contact hello@verrsa.org
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>11. Updates to Guidelines</h2>
          <p style={styles.sectionText}>
            We may update these guidelines as our community grows and evolves.
            Continued use of Verrsa constitutes acceptance of updated
            guidelines. We'll notify users of significant changes.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>12. Contact Us</h2>
          <p style={styles.sectionText}>
            Questions about these guidelines?
          </p>
          <p style={styles.sectionText}>
            Email: hello@verrsa.org
            <br />Subject: Community Guidelines Inquiry
          </p>
          <p style={styles.sectionText}>
            Thank you for helping make Verrsa a welcoming, creative
            community for everyone.
          </p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © {new Date().getFullYear()} Verrsa. All rights reserved.
          </p>
        </div>

        {/* Extra padding at bottom */}
        <div style={{ height: "30px" }} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    position: "relative",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  headerInfo: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#dcf6ff",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          position: "sticky" as const,
          top: 0,
          marginBottom: 0,
          zIndex: 100,
        } as React.CSSProperties,
        logo: {
          width: "100px",
          height: "35px",
          marginLeft: "-10px",
          objectFit: "contain" as const,
        } as React.CSSProperties,
        signInButton: {
           backgroundColor: "#00bfff",
          padding: "12px 24px",
          borderRadius: "8px",
          border: "none",
          marginRight: "-10px",
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
  backButton: {
    position: "absolute",
    top: "69px",
    left: "20px",
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: "20px",
    padding: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
     marginTop: "35px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "25px",
    paddingBottom: "20px",
    borderBottom: "1px solid #eee",
  },
  title: {
    fontSize: "25px",
    fontWeight: "600",
    color: "#000",
    margin: 0,
  },
  contentContainer: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 20px",
    overflowY: "auto",
  },
  lastUpdated: {
    fontSize: "13px",
    color: "#666",
    textAlign: "center",
    marginTop: "16px",
    marginBottom: "20px",
    fontStyle: "italic",
    margin: "16px 0 20px 0",
  },
  introText: {
    fontSize: "15px",
    lineHeight: "28px",
    color: "#444",
    marginBottom: "12px",
    textAlign: "center",
    padding: "0 12px",
    margin: "0 0 12px 0",
  },
  section: {
    marginBottom: "25px",
  },
  sectionHeader: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#000",
    marginBottom: "12px",
    margin: "0 0 12px 0",
  },
  sectionText: {
    fontSize: "15px",
    lineHeight: "28px",
    color: "#444",
    marginBottom: "12px",
    margin: "0 0 12px 0",
  },
  bulletText: {
    fontSize: "15px",
    lineHeight: "30px",
    color: "#555",
    marginLeft: "12px",
    margin: "0 0 0 12px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "20px",
    marginBottom: "12px",
  },
  footerText: {
    fontSize: "13px",
    color: "#888",
    margin: 0,
  },
};
