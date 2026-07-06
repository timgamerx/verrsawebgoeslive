// @ts-nocheck

import React from "react";
import { useRouter } from "next/router";
import { IoChevronBack } from "react-icons/io5";

export default function AmbassadorTerms() {
  const router = useRouter();

  return (
    <div style={styles.scrollView}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => router.back()}>
            <IoChevronBack size={28} color="#000" />
          </button>
          <h1 style={styles.headerTitle}>Ambassador Program Terms &amp; Conditions</h1>
        </div>

        <p style={styles.lastUpdated}>Date: 06 July, 2026</p>

        <h2 style={styles.sectionTitle}>1. Introduction</h2>
        <p style={styles.paragraph}>
          This document establishes the official terms governing participation in the Verrsa Ambassador Program.
        </p>
        <p style={styles.paragraph}>
          The program is designed to recognize individuals who actively contribute to the growth of Verrsa through
          community building, creator referrals, user acquisition, brand advocacy, partnerships, and strategic promotion.
        </p>
        <p style={styles.paragraph}>
          Outstanding ambassadors may become eligible to receive equity awards from the Verrsa Ambassador Equity Program,
          subject to the terms outlined below.
        </p>

        <h2 style={styles.sectionTitle}>2. Eligibility</h2>
        <p style={styles.paragraph}>
          To become a Verrsa Ambassador, participants must:
          <br />• Be at least 18 years old (or the legal age in their jurisdiction)
          <br />• Maintain an active Verrsa account
          <br />• Represent Verrsa professionally and ethically
          <br />• Comply with Verrsa's Community Guidelines and Terms of Service
          <br />• Be accepted into the Ambassador Program
        </p>
        <p style={styles.paragraph}>
          Acceptance into the program does not automatically entitle an ambassador to receive equity.
        </p>

        <h2 style={styles.sectionTitle}>3. Ambassador Responsibilities</h2>
        <p style={styles.paragraph}>
          Ambassadors are expected to contribute by:
          <br />• Promoting Verrsa across social media platforms
          <br />• Inviting creators to join Verrsa
          <br />• Encouraging user registrations
          <br />• Organizing online or offline awareness activities
          <br />• Referring strategic partners where possible
          <br />• Providing product feedback
          <br />• Reporting bugs and user concerns
          <br />• Representing Verrsa positively within their communities
        </p>

        <h2 style={styles.sectionTitle}>4. Performance Evaluation</h2>
        <p style={styles.paragraph}>
          Participation is measured using both quantitative and qualitative metrics.
        </p>
        <p style={styles.paragraph}>
          Examples include:
          <br />• Verified creator referrals
          <br />• Verified user sign-ups
          <br />• Active users retained
          <br />• Community engagement
          <br />• Event participation
          <br />• Educational content about Verrsa
          <br />• Brand advocacy
          <br />• Overall contribution to platform growth
        </p>
        <p style={styles.paragraph}>
          The Founder or designated management team will determine performance based on internal records.
        </p>

        <h2 style={styles.sectionTitle}>5. Ambassador Equity Program</h2>
        <p style={styles.paragraph}>
          Verrsa has established an Ambassador Equity Program to recognize exceptional ambassadors who make meaningful
          long-term contributions to the company's growth.
        </p>
        <p style={styles.paragraph}>
          Equity awards:
          <br />• Are discretionary
          <br />• Are not guaranteed
          <br />• May vary between ambassadors
          <br />• Are subject to Founder approval
          <br />• Are documented through separate Equity Grant Letters
        </p>
        <p style={styles.paragraph}>
          No ambassador acquires ownership simply by joining the program.
        </p>

        <h2 style={styles.sectionTitle}>6. Vesting</h2>
        <p style={styles.paragraph}>
          If equity is awarded, it will generally follow Verrsa's standard vesting structure unless otherwise specified.
        </p>
        <p style={styles.paragraph}>
          Standard vesting:
          <br />• Four-year vesting period
          <br />• Six-month cliff
          <br />• Monthly vesting after the cliff
        </p>
        <p style={styles.paragraph}>
          If an ambassador leaves before completing the cliff period, no equity vests unless otherwise approved in writing.
        </p>

        <h2 style={styles.sectionTitle}>7. Performance Milestones</h2>
        <p style={styles.paragraph}>
          Before equity may be considered, ambassadors are expected to demonstrate consistent contributions over time.
        </p>
        <p style={styles.paragraph}>
          Evaluation may include:
          <br />• Creator acquisition
          <br />• User growth
          <br />• User retention
          <br />• Marketing initiatives
          <br />• Partnership introductions
          <br />• Community leadership
          <br />• Strategic contributions
          <br />• Long-term commitment
        </p>
        <p style={styles.paragraph}>
          Meeting performance milestones does not automatically guarantee an equity award.
        </p>

        <h2 style={styles.sectionTitle}>8. Maximum Allocation</h2>
        <p style={styles.paragraph}>
          Individual equity awards are determined solely by Verrsa.
        </p>
        <p style={styles.paragraph}>
          Allocation depends on:
          <br />• Overall impact
          <br />• Duration of contribution
          <br />• Strategic value
          <br />• Company growth stage
          <br />• Availability within the Ambassador Equity Program
        </p>
        <p style={styles.paragraph}>
          No participant is entitled to a fixed percentage of company ownership.
        </p>

        <h2 style={styles.sectionTitle}>9. Confidentiality</h2>
        <p style={styles.paragraph}>
          Ambassadors agree to keep confidential any non-public information relating to Verrsa, including:
          <br />• Product roadmap
          <br />• Business strategy
          <br />• Internal operations
          <br />• Financial information
          <br />• Creator data
          <br />• Partnership discussions
        </p>

        <h2 style={styles.sectionTitle}>10. Intellectual Property</h2>
        <p style={styles.paragraph}>
          Any original work specifically commissioned by Verrsa as part of the Ambassador Program shall remain the
          property of Verrsa unless otherwise agreed in writing.
        </p>

        <h2 style={styles.sectionTitle}>11. Termination</h2>
        <p style={styles.paragraph}>
          Verrsa may suspend or terminate an ambassador's participation at any time for:
          <br />• Misconduct
          <br />• Fraud
          <br />• Misrepresentation
          <br />• Abuse of the program
          <br />• Violation of Verrsa policies
          <br />• Conduct damaging to the Verrsa brand
        </p>
        <p style={styles.paragraph}>
          Unvested equity, if any, will be forfeited according to the applicable equity agreement.
        </p>

        <h2 style={styles.sectionTitle}>12. Program Changes</h2>
        <p style={styles.paragraph}>
          Verrsa reserves the right to:
          <br />• Modify the Ambassador Program
          <br />• Update eligibility requirements
          <br />• Revise reward structures
          <br />• Amend these Terms &amp; Conditions
          <br />• Suspend or discontinue the program
        </p>
        <p style={styles.paragraph}>
          Reasonable notice will be provided where practical.
        </p>

        <h2 style={styles.sectionTitle}>13. Agreement</h2>
        <p style={styles.paragraph}>
          By joining the Verrsa Ambassador Program, participants acknowledge that they have read, understood, and agree
          to these Terms &amp; Conditions.
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
    fontWeight: "400",
    textAlign: "center",
    color: "#0F172A",
    margin: "50px 0 20px 0",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "400",
    color: "#0F172A",
    margin: "24px 0 12px 0",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "28px",
    color: "#888",
    textAlign: "left",
    margin: "0 0 16px 0",
  },
  lastUpdated: {
    fontSize: "13px",
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    margin: "0 0 24px 0",
  },
  footer: {
    fontSize: "15px",
    color: "#888",
    textAlign: "center",
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
