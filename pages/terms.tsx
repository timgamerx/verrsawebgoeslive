// @ts-nocheck

import React from "react";
import { Platform } from '../lib/reactNativeShim';
import { useRouter } from 'next/router';
import { IoChevronBack } from "react-icons/io5";

export default function TermsandConditions() {
  const router = useRouter();
  
  return (
    <div >

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

      <div style={styles.container}>

        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <IoChevronBack size={28} color="#000" />
          </button>
          <h1 style={styles.headerTitle}>Terms and Conditions</h1>
        </div>

        <p style={styles.lastUpdated}>Last updated: November 06, 2025</p>

        <h2 style={styles.sectionTitle}>1. Introduction</h2>
        <p style={styles.paragraph}>
          Welcome to Verrsa! These Terms and Conditions ("Terms") govern your
          access to and use of our platform, services, and applications
          (collectively, the "Platform"), which enable creators including writers,
          podcasters, video creators, and community builders to create, connect,
          share, and earn through their content. By accessing or using Verrsa, you
          agree to be bound by these Terms.
        </p>

        <h2 style={styles.sectionTitle}>2. Acceptance of Terms</h2>
        <p style={styles.paragraph}>
          By creating an account, accessing, or using Verrsa, you acknowledge that
          you have read, understood, and agree to be bound by these Terms, our
          Privacy Policy, and Community Guidelines. If you do not agree with any
          part of these Terms, you must not use our Platform.
        </p>
        <p style={styles.paragraph}>
          You must be at least 13 years old (or the age of majority in
          your jurisdiction) to use Verrsa. If you are under 18, you represent
          that you have parental or guardian consent.
        </p>

        <h2 style={styles.sectionTitle}>3. Account Responsibilities</h2>
        <p style={styles.paragraph}>
          • You are responsible for maintaining the confidentiality of your
          account credentials
          <br />• You agree to provide accurate, current, and complete information
          <br />• You must notify us immediately of any unauthorized use of your
          account
          <br />• You are responsible for all activities that occur under your
          account
          <br />• You may not transfer, sell, or share your account with others
          <br />• We reserve the right to suspend or terminate accounts that
          violate these Terms
        </p>

        <h2 style={styles.sectionTitle}>4. User Content and Ownership</h2>
        <p style={styles.paragraph}>
          You retain all ownership rights to content you create and share on
          Verrsa. By posting content, you grant Verrsa a worldwide, non-exclusive,
          royalty-free license to use, reproduce, modify, adapt, publish, and
          distribute your content for the purpose of operating and promoting the
          Platform.
        </p>
        <p style={styles.paragraph}>
          You represent and warrant that:
          <br />• You own or have the necessary rights to all content you post
          <br />• Your content does not infringe on third-party rights
          <br />• Your content complies with applicable laws and our Community
          Guidelines
          <br />• You will not post harmful, illegal, or prohibited content
        </p>

        <h2 style={styles.sectionTitle}>5. Monetization and Payments</h2>
        <p style={styles.paragraph}>
          Verrsa offers monetization features that allow eligible creators to earn
          revenue from their content through subscriptions, tips, paid content,
          and advertising.
        </p>
        <p style={styles.paragraph}>
          Monetization Terms:
          <br />• Eligibility criteria must be met and maintained
          <br />• Revenue share percentages are specified in your Creator
          Dashboard
          <br />• Payment thresholds and processing times apply
          <br />• We reserve the right to withhold payments for violations
          <br />• Tax compliance is your responsibility
          <br />• Payment methods and currencies may vary by region
        </p>

        <h2 style={styles.sectionTitle}>6. Prohibited Activities</h2>
        <p style={styles.paragraph}>
          You agree not to:
          <br />• Violate any laws or regulations
          <br />• Infringe on intellectual property rights
          <br />• Post spam, malware, or malicious content
          <br />• Harass, bully, or threaten other users
          <br />• Manipulate platform features or engagement metrics
          <br />• Create fake accounts or impersonate others
          <br />• Scrape or data mine the Platform
          <br />• Interfere with Platform security or functionality
          <br />• Use the Platform for illegal commercial purposes
        </p>

        <h2 style={styles.sectionTitle}>7. Intellectual Property Rights</h2>
        <p style={styles.paragraph}>
          The Verrsa Platform, including its design, features, functionality,
          trademarks, logos, and software, is owned by Verrsa and protected by
          international copyright, trademark, and other intellectual property
          laws.
        </p>
        <p style={styles.paragraph}>
          You may not:
          <br />• Copy, modify, or create derivative works of the Platform
          <br />• Reverse engineer or decompile any part of our services
          <br />• Use our trademarks without express written permission
          <br />• Remove or alter any copyright or proprietary notices
        </p>

        <h2 style={styles.sectionTitle}>8. Content Moderation</h2>
        <p style={styles.paragraph}>
          We reserve the right to review, monitor, remove, or restrict access to
          any content that violates these Terms or our Community Guidelines. This
          includes, but is not limited to:
          <br />• Removing content that violates our policies
          <br />• Suspending or terminating accounts
          <br />• Restricting monetization privileges
          <br />• Reporting illegal content to authorities
        </p>
        <p style={styles.paragraph}>
          We are not obligated to pre-screen content but may do so at our
          discretion.
        </p>

        <h2 style={styles.sectionTitle}>
          9. Disclaimers and Limitation of Liability
        </h2>
        <p style={styles.paragraph}>
          THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE
          DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, VERRSA SHALL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING FROM YOUR USE
          OF THE PLATFORM.
        </p>

        <h2 style={styles.sectionTitle}>10. Indemnification</h2>
        <p style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless Verrsa, its
          affiliates, officers, directors, employees, and agents from any claims,
          damages, losses, liabilities, and expenses (including legal fees)
          arising from:
          <br />• Your use of the Platform
          <br />• Your content or conduct
          <br />• Your violation of these Terms
          <br />• Your violation of any third-party rights
        </p>

        <h2 style={styles.sectionTitle}>11. Termination</h2>
        <p style={styles.paragraph}>
          You may terminate your account at any time through your account
          settings. We may suspend or terminate your account at any time, with or
          without notice, for violations of these Terms or at our sole discretion.
        </p>
        <p style={styles.paragraph}>
          Upon termination:
          <br />• Your right to access the Platform ceases immediately
          <br />• We may delete your content and account data
          <br />• Outstanding payment obligations survive termination
          <br />• Provisions regarding liability and disputes remain in effect
        </p>

        <h2 style={styles.sectionTitle}>12. Changes to Terms</h2>
        <p style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will notify
          users of material changes via email or platform notification. Your
          continued use of Verrsa after such changes constitutes acceptance of the
          modified Terms. If you disagree with the changes, you must stop using
          the Platform.
        </p>

        <h2 style={styles.sectionTitle}>13. Dispute Resolution</h2>
        <p style={styles.paragraph}>
          Any disputes arising from these Terms or your use of Verrsa shall be
          resolved through binding arbitration, except where prohibited by law.
          You agree to waive the right to participate in class actions.
        </p>
        <p style={styles.paragraph}>
          Before initiating arbitration, you agree to contact us at
          hello@verrsa.org to attempt informal resolution.
        </p>

        <h2 style={styles.sectionTitle}>14. Governing Law</h2>
        <p style={styles.paragraph}>
          These Terms are governed by and construed in accordance with the laws of
          the jurisdiction in which Verrsa operates, without regard to its
          conflict of law principles. You agree to submit to the exclusive
          jurisdiction of the courts in that location for any disputes arising
          from these Terms.
        </p>

        <h2 style={styles.sectionTitle}>15. Severability</h2>
        <p style={styles.paragraph}>
          If any provision of these Terms is found to be unenforceable or invalid,
          that provision will be limited or eliminated to the minimum extent
          necessary, and the remaining provisions will remain in full force and
          effect.
        </p>

        <h2 style={styles.sectionTitle}>16. Entire Agreement</h2>
        <p style={styles.paragraph}>
          These Terms, together with our Privacy Policy and Community Guidelines,
          constitute the entire agreement between you and Verrsa regarding your
          use of the Platform and supersede all prior agreements and
          understandings.
        </p>

        <h2 style={styles.sectionTitle}>17. Contact Information</h2>
        <p style={styles.paragraph}>
          If you have any questions about these Terms and Conditions, please
          contact us:
        </p>
        <p style={styles.paragraph}>
          Email: hello@verrsa.org
          <br />Subject: Terms and Conditions Inquiry
        </p>
        <p style={styles.paragraph}>
          We will respond to your inquiries within a reasonable timeframe.
        </p>
        
        <p style={styles.footer}>© {new Date().getFullYear()} Verrsa. All rights reserved.</p>
      </div>
    </div>
  );
}

const styles = {
  scrollView: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    overflowY: "auto",
  },
  container: {
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
    backgroundColor: "#fff",
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
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: "16px",
    minHeight: "100px",
  },
  headerTitle: {
    fontSize: "28px",
    fontWeight: "600",
    marginTop: "50px",
    marginBottom: "20px",
    textAlign: "center",
    color: "#0F172A",
    margin: "50px 0 20px 0",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginTop: "24px",
    marginBottom: "12px",
    color: "#0F172A",
    margin: "24px 0 12px 0",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "28px",
    color: "#444",
    marginBottom: "16px",
    textAlign: "left",
    margin: "0 0 16px 0",
  },
  lastUpdated: {
    fontSize: "13px",
    color: "#444",
    textAlign: "center",
    marginBottom: "24px",
    fontStyle: "italic",
    margin: "0 0 24px 0",
  },
  footer: {
    fontSize: "15px",
    color: "#444",
    textAlign: "center",
    marginTop: "48px",
    margin: "48px 0 0 0",
  },
  backButton: {
    position: "absolute",
    top: "50px",
    left: "-5px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
