// @ts-nocheck

import React from "react";
import { useRouter } from 'next/router';
import { IoChevronBack } from "react-icons/io5";

export default function Privacy() {
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
        <h1 style={styles.title}>Privacy Policy</h1>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.section}>
          <p style={styles.lastUpdated}>Last updated: November 06, 2025</p>

          <p style={styles.sectionText}>
            At Verrsa, we are committed to protecting your privacy and ensuring
            the security of your personal information. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our platform, services, and applications.
          </p>
          <p style={styles.sectionText}>
            By using Verrsa, you consent to the data practices described in this
            policy. Please read this policy carefully to understand our views
            and practices regarding your personal data.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>1. Information We Collect</h2>

          <h3 style={styles.subsectionHeader}>1.1 Information You Provide</h3>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Account Information:</strong> When you
            create an account, we collect your name, email address, username,
            password, and optional profile information (bio, avatar, location).
          </p>
          <div style={styles.section}>
            <h2 style={styles.sectionHeader}>Terms of Use (EULA)</h2>
            <p style={styles.sectionText}>
              You can review our Terms of Use (EULA) at:
            </p>
            <p style={styles.sectionText}>
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#007aff", textDecoration: "underline" }}
              >
                https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
              </a>
            </p>
          </div>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Content:</strong> Articles, podcasts,
            videos, comments, messages, community posts, and other content you
            create or share.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Payment Information:</strong> Payment
            details for monetization, including bank account information, PayPal
            email, or payment processor data (processed securely by our payment
            partners).
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Communications:</strong> Messages you send
            to us or other users, including support requests and feedback.
          </p>

          <h3 style={styles.subsectionHeader}>
            1.2 Automatically Collected Information
          </h3>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Usage Data:</strong> Pages viewed, features
            used, content interactions (likes, comments, shares), time spent,
            search queries, and navigation patterns.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Device Information:</strong> Device type,
            operating system, browser type, unique device identifiers, IP
            address, and mobile network information.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Advertising Identifiers:</strong> Mobile
            advertising IDs, cookies, pixels, and similar identifiers that allow
            us and our partners to understand engagement across apps and devices
            when you grant tracking permissions.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Location Data:</strong> Approximate location
            based on IP address, and precise location if you grant permission.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Cookies and Similar Technologies:</strong>{" "}
            We use cookies, web beacons, and similar technologies to collect
            data about your browsing activities and preferences.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>2. How We Use Your Information</h2>
          <p style={styles.sectionText}>
            We use your information for the following purposes:
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Service Delivery:</strong>
            <br />• Provide, operate, and maintain the Platform
            <br />• Create and manage your account
            <br />• Process and deliver content
            <br />• Enable content discovery and recommendations
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Payments and Transactions:</strong>
            <br />• Process monetization payments
            <br />• Manage subscriptions and purchases
            <br />• Prevent fraud and financial crimes
            <br />• Generate invoices and transaction records
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Communications:</strong>
            <br />• Send service updates and notifications
            <br />• Respond to inquiries and support requests
            <br />• Send marketing communications (with your consent)
            <br />• Provide important policy or feature updates
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Personalization:</strong>
            <br />• Customize content recommendations
            <br />• Improve user experience
            <br />• Remember your preferences
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Advertising and Measurement:</strong>
            <br />• Deliver relevant promotions and sponsored content when you
            opt into tracking
            <br />• Measure advertising performance and reach
            <br />• Detect and prevent advertising fraud and misuse
            <br />• Honor platform-level tracking choices and consents
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Analytics and Improvement:</strong>
            <br />• Analyze usage patterns and trends
            <br />• Conduct research and development
            <br />• Test new features
            <br />• Improve Platform functionality and performance
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Safety and Security:</strong>
            <br />• Detect and prevent fraud, spam, and abuse
            <br />• Enforce our Terms and policies
            <br />• Protect user safety and rights
            <br />• Comply with legal obligations
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>
            3. Information Sharing and Disclosure
          </h2>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>
              We do not sell your personal information.
            </strong>{" "}
            We may share your information in the following circumstances:
          </p>
          <h3 style={styles.subsectionHeader}>3.1 Public Information</h3>
          <p style={styles.sectionText}>
            Information you choose to make public, including:
            <br />• Your profile information (name, bio, profile picture)
            <br />• Content you post (articles, videos, comments)
            <br />• Your followers and following lists
            <br />• Public engagement metrics (likes, shares, views)
          </p>
          <h3 style={styles.subsectionHeader}>3.2 Service Providers</h3>
          <p style={styles.sectionText}>
            We share limited information with service providers who help us
            operate the platform:
            <br />• Cloud hosting and storage services
            <br />• Payment processing (Paystack, Flutterwave)
            <br />• Email delivery services
            <br />• Analytics and performance monitoring
            <br />• Customer support tools
            <br />• Advertising measurement and attribution partners (if you
            provide tracking consent)
            <br />• Content delivery networks
          </p>
          <p style={styles.sectionText}>
            These providers are contractually obligated to protect your
            data and only use it for the specific services they provide to us.
          </p>
          <p style={styles.sectionText}>
            When you allow tracking, we may also share hashed identifiers and
            engagement insights with advertising networks and sponsor partners
            to deliver, personalize, and measure campaigns. We require these
            partners to honor applicable laws, industry standards, and your
            platform-level privacy choices.
          </p>
          <h3 style={styles.subsectionHeader}>3.3 Business Transfers</h3>
          <p style={styles.sectionText}>
            If Verrsa is involved in a merger, acquisition, or sale of assets,
            your information may be transferred. We will notify you before your
            information becomes subject to a different privacy policy.
          </p>
          <h3 style={styles.subsectionHeader}>3.4 Legal Requirements</h3>
          <p style={styles.sectionText}>
            We may disclose your information when required by law or to:
            <br />• Comply with legal process or government requests
            <br />• Enforce our Terms and policies
            <br />• Protect the rights, property, or safety of Verrsa, users, or
            the public
            <br />• Prevent fraud or security issues
          </p>
          <h3 style={styles.subsectionHeader}>3.5 With Your Consent</h3>
          <p style={styles.sectionText}>
            We may share your information with other parties when you give us
            explicit consent to do so.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>4. Data Security</h2>
          <p style={styles.sectionText}>
            We take the security of your personal information seriously and
            implement multiple layers of protection.
          </p>
          <h3 style={styles.subsectionHeader}>4.1 Security Measures</h3>
          <p style={styles.sectionText}>
            Our security practices include:
            <br />• Encryption of data in transit using SSL/TLS
            <br />• Encryption of sensitive data at rest
            <br />• Regular security audits and assessments
            <br />• Secure authentication and access controls
            <br />• Monitoring for suspicious activity
            <br />• Employee training on data protection
          </p>
          <h3 style={styles.subsectionHeader}>4.2 Account Security</h3>
          <p style={styles.sectionText}>
            You can help protect your account by:
            <br />• Using a strong, unique password
            <br />• Enabling two-factor authentication when available
            <br />• Not sharing your account credentials
            <br />• Logging out of shared devices
            <br />• Reporting suspicious activity immediately
          </p>
          <h3 style={styles.subsectionHeader}>4.3 Limitations</h3>
          <p style={styles.sectionText}>
            While we implement industry-standard security measures, no method of
            transmission over the internet or electronic storage is 100% secure.
            We cannot guarantee absolute security, and you use the Platform at
            your own risk.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>5. Your Privacy Rights</h2>
          <p style={styles.sectionText}>
            Depending on your location, you may have certain rights regarding
            your personal information:
          </p>
          <h3 style={styles.subsectionHeader}>5.1 Access and Portability</h3>
          <p style={styles.sectionText}>
            • Right to access your personal information
            <br />• Right to receive a copy of your data in a portable format
            <br />• Right to transfer your data to another service
          </p>
          <h3 style={styles.subsectionHeader}>5.2 Correction and Deletion</h3>
          <p style={styles.sectionText}>
            • Right to correct inaccurate or incomplete information
            <br />• Right to delete your account and associated data
            <br />• Right to request removal of specific content
          </p>
          <h3 style={styles.subsectionHeader}>5.3 Control and Objection</h3>
          <p style={styles.sectionText}>
            • Right to object to processing of your information
            <br />• Right to restrict certain data processing activities
            <br />• Right to withdraw consent at any time
            <br />• Right to opt out of marketing communications
            <br />• Right to disable targeted advertising via device settings
            (e.g., App Tracking Transparency, Limit Ad Tracking) and in-app
            controls
          </p>
          <h3 style={styles.subsectionHeader}>5.4 Exercising Your Rights</h3>
          <p style={styles.sectionText}>
            To exercise these rights, contact us at privacy@verrsa.org. We will
            respond to your request within 30 days. Some rights may be limited
            by applicable law or Platform functionality requirements.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>6. Data Retention</h2>
          <p style={styles.sectionText}>
            We retain different types of information for varying periods based
            on legal requirements and business needs.
          </p>
          <h3 style={styles.subsectionHeader}>6.1 Active Accounts</h3>
          <p style={styles.sectionText}>
            • Account information: Retained while your account is active
            <br />• Content: Retained until you delete it or close your account
            <br />• Usage data: Retained for up to 2 years for analytics
            <br />• Payment records: Retained for 7 years for tax compliance
          </p>
          <h3 style={styles.subsectionHeader}>6.2 Deleted Accounts</h3>
          <p style={styles.sectionText}>
            When you delete your account:
            <br />• Profile and content deleted within 30 days
            <br />• Backup copies deleted within 90 days
            <br />• Some information retained for legal compliance (payment
            records, violation reports)
            <br />• Anonymized data may be retained for analytics
          </p>
          <h3 style={styles.subsectionHeader}>6.3 Legal Obligations</h3>
          <p style={styles.sectionText}>
            We may retain certain information longer when required by law,
            including:
            <br />• Financial transaction records
            <br />• Legal dispute documentation
            <br />• Records of Terms violations
            <br />• Information subject to legal holds
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>7. Children's Privacy</h2>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Age Requirement:</strong> Our services are
            not intended for children under the age of 13. We do not knowingly
            collect personal information from children under 13 without
            verifiable parental consent.
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Age Verification:</strong> By creating an
            account, you confirm that you are at least 13 years old (or the
            minimum age in your country).
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Parental Rights:</strong> If you are a
            parent or guardian and believe your child has provided us with
            personal information, please contact us at privacy@verrsa.org. We
            will take steps to delete such information promptly.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>8. International Data Transfers</h2>
          <p style={styles.sectionText}>
            Verrsa operates globally, and your information may be transferred
            to, stored in, and processed in countries other than your country of
            residence.
          </p>
          <h3 style={styles.subsectionHeader}>8.1 Data Storage Locations</h3>
          <p style={styles.sectionText}>
            Our servers and service providers are located in:
            <br />• United States
            <br />• European Union
            <br />• Other regions where our users are located
          </p>
          <h3 style={styles.subsectionHeader}>8.2 Safeguards</h3>
          <p style={styles.sectionText}>
            For transfers from the European Economic Area (EEA), we rely on:
            <br />• Standard Contractual Clauses approved by the EU Commission
            <br />• Adequacy decisions by regulatory authorities
            <br />• Other lawful transfer mechanisms
          </p>
          <p style={styles.sectionText}>
            We ensure all international transfers comply with applicable data
            protection laws, including GDPR and other regional privacy
            regulations.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>9. Changes to This Policy</h2>
          <p style={styles.sectionText}>
            We may update this Privacy Policy periodically to reflect changes in
            our practices, technology, legal requirements, or other factors.
          </p>
          <h3 style={styles.subsectionHeader}>9.1 Notification Methods</h3>
          <p style={styles.sectionText}>
            We will notify you of changes by:
            <br />• Posting the updated policy on the Platform with a new "Last
            Updated" date
            <br />• Sending an email notification for material changes
            <br />• Displaying an in-app notification
          </p>
          <h3 style={styles.subsectionHeader}>9.2 Your Acceptance</h3>
          <p style={styles.sectionText}>
            By continuing to use the Platform after changes take effect, you
            accept the updated Privacy Policy. If you do not agree with changes,
            please discontinue use and contact us to delete your account. We
            encourage you to review this Privacy Policy periodically.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionHeader}>10. Contact Us</h2>
          <p style={styles.sectionText}>
            If you have questions, concerns, or requests regarding this Privacy
            Policy or our data practices, please contact us:
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>Privacy Inquiries:</strong>
            <br />Email: hello@verrsa.org
            <br />Subject: Privacy Policy Question
          </p>
          <p style={styles.sectionText}>
            <strong style={styles.bold}>General Support:</strong>
            <br />Email: hello@verrsa.org
            <br />Website: https://www.verrsa.org
          </p>
          <p style={styles.sectionText}>
            We will respond to your inquiries within 30 days and work diligently
            to address any concerns you may have about your privacy and data
            protection.
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
    paddingTop: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #eee",
  },
  title: {
    fontSize: "32px",
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
  subsectionHeader: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#000",
    marginTop: "8px",
    marginBottom: "8px",
    margin: "8px 0",
  },
  sectionText: {
    fontSize: "15px",
    lineHeight: "28px",
    color: "#444",
    marginBottom: "12px",
    margin: "0 0 12px 0",
  },
  bold: {
    fontWeight: "600",
    color: "#000",
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
