// @ts-nocheck
import { spacing, radius, fontSize } from "./theme";

export const makeSettingStyles = (theme) => ({
  container: { minHeight: "100vh", backgroundColor: theme.background, paddingBottom: 80 },
  header: {
    display: "flex", alignItems: "center", gap: spacing.md,
    padding: `${spacing.md}px ${spacing.base}px`,
    borderBottom: `1px solid ${theme.border}`,
  },
  title: { flex: 1, textAlign: "center", fontSize: fontSize.lg, fontWeight: 600, color: theme.text },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" },
  content: { maxWidth: 640, margin: "0 auto", padding: spacing.base },
  avatar: {
    width: 85, height: 85, borderRadius: "50%", border: "3px solid #000",
    display: "block", margin: `${spacing.lg}px auto`, objectFit: "cover", cursor: "pointer",
  },
  center: { textAlign: "center" },
  name: { fontSize: fontSize.lg, fontWeight: 600, color: theme.text, display: "inline-flex", alignItems: "center", gap: 4 },
  email: { fontSize: fontSize.md, color: "#999", marginTop: 4 },
  verifyBtn: {
    display: "inline-flex", alignItems: "center", gap: spacing.sm, border: "none", color: "#fff",
    padding: `${spacing.sm}px ${spacing.base}px`, borderRadius: radius.md, marginTop: spacing.base,
    cursor: "pointer", fontSize: fontSize.md,
  },
  section: { backgroundColor: theme.cardBackground, borderRadius: radius.lg, padding: spacing.base, marginTop: spacing.lg },
  sectionHeader: { fontSize: fontSize.base, fontWeight: 700, color: theme.text, marginBottom: spacing.sm },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
    background: "none", border: "none", padding: `${spacing.md}px 0`, cursor: "pointer", textAlign: "left",
    gap: spacing.md,
  },
  rowLeft: { display: "flex", alignItems: "center", gap: spacing.md, flex: 1 },
  rowText: { fontSize: fontSize.base, color: theme.text },
  subText: { fontSize: fontSize.sm, color: theme.secondaryText },
  divider: { height: 1, backgroundColor: theme.border },
  overlay: {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: spacing.base,
  },
  modal: {
    backgroundColor: theme.cardBackground, borderRadius: radius.lg, padding: spacing.lg,
    width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  primaryBtn: {
    backgroundColor: "#00BFFF", color: "#fff", border: "none", borderRadius: radius.md,
    padding: `${spacing.md}px ${spacing.lg}px`, cursor: "pointer", fontSize: fontSize.base, width: "100%",
  },
  secondaryBtn: {
    backgroundColor: "#eee", color: "#333", border: "none", borderRadius: radius.md,
    padding: `${spacing.md}px ${spacing.lg}px`, cursor: "pointer", fontSize: fontSize.base, flex: 1,
  },
  badge: { fontSize: fontSize.xs, marginLeft: spacing.sm, color: theme.accent },
});
