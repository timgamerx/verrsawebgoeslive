// @ts-nocheck
import React from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { MdMonetizationOn } from "react-icons/md";
import { useTheme } from "../context/ThemeProvider";
import { useTips, MIN_WITHDRAWAL } from "../hooks/useTips";
import TipCard from "../components/TipCard";
import TwoFactorModal from "../components/TwoFactorModal";
import { spacing, radius } from "../lib/theme";

/** Tips (cash gifts) the signed-in user has received, with withdrawal. */
export default function Tips() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = useTips();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.background }}>
      <div style={s.header}>
        <button onClick={() => router.back()} style={s.backBtn}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>Tips</div>
        <div style={s.backBtn} />
      </div>

      <div style={s.content}>
        {t.loading ? (
          <div style={{ textAlign: "center", marginTop: 40, color: theme.secondaryText }}>
            Loading…
          </div>
        ) : (
          <>
            <div
              style={{
                ...s.summary,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              }}
            >
              <MdMonetizationOn size={32} color="#00bfff" />
              <div style={{ ...s.label, color: theme.secondaryText }}>Total tips received</div>
              <div style={{ ...s.amount, color: theme.text }}>${t.total.toFixed(2)}</div>
              <div style={{ ...s.label, color: theme.secondaryText }}>
                {t.tips.length} {t.tips.length === 1 ? "tip" : "tips"}
              </div>
              <div style={{ ...s.label, color: theme.secondaryText, marginTop: 10 }}>
                Available to withdraw: ${t.available.toFixed(2)}
              </div>
              <button
                onClick={t.handleWithdraw}
                disabled={t.withdrawing}
                style={{
                  ...s.withdraw,
                  opacity: t.available < MIN_WITHDRAWAL || t.withdrawing ? 0.5 : 1,
                }}
              >
                {t.withdrawing ? "Submitting…" : "Withdraw"}
              </button>
              <div style={{ fontSize: 11, marginTop: 8, color: theme.secondaryText }}>
                Minimum withdrawal $2.00
              </div>
            </div>

            {t.tips.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 40,
                  fontSize: 14,
                  lineHeight: "21px",
                  color: theme.secondaryText,
                }}
              >
                No tips yet. When someone gifts you cash from your profile, it will show up here.
              </div>
            ) : (
              t.tips.map((tip) => <TipCard key={tip.id} tip={tip} theme={theme} />)
            )}
          </>
        )}
      </div>

      {t.show2FA && (
        <TwoFactorModal
          theme={theme}
          code={t.code}
          setCode={t.setCode}
          busy={t.withdrawing}
          onCancel={() => {
            t.setShow2FA(false);
            t.setCode("");
          }}
          onVerify={t.verify2FAAndWithdraw}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px`,
  },
  backBtn: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  content: {
    maxWidth: 700,
    margin: "0 auto",
    padding: spacing.base,
    paddingBottom: 60,
    boxSizing: "border-box",
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    border: "1px solid",
    marginBottom: spacing.base,
  },
  label: { fontSize: 13, marginTop: 4 },
  amount: { fontSize: 32, fontWeight: 700, marginTop: 4, lineHeight: "42px" },
  withdraw: {
    backgroundColor: "#00bfff",
    color: "#000",
    fontWeight: 700,
    fontSize: 15,
    border: "none",
    borderRadius: 999,
    padding: "12px 40px",
    marginTop: 14,
    minWidth: 160,
    cursor: "pointer",
  },
};
