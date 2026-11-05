// @ts-nocheck
const isTimestampLike = (v) => {
  if (!v) return false;
  const t = v.trim();
  return (
    /^\+?\d{4}[+-]\d{2}[+-]\d{2}/.test(t) ||
    /^\d{4}-\d{2}-\d{2}T/.test(t) ||
    /^\+\d{4}\+\d{2}\+\d{2}\d{2}:\d{2}:\d{2}/.test(t)
  );
};

export const cleanName = (primary, fallback) => {
  const p = primary?.trim();
  if (p && !isTimestampLike(p)) return p;
  const f = fallback?.trim();
  if (f && !isTimestampLike(f)) return f;
  return null;
};

const normalizeTimestamp = (v) => {
  if (!v) return null;
  let n = v.trim();
  if (/^\+\d{4}\+\d{2}\+\d{2}/.test(n)) {
    n = n.replace(/^\+(\d{4})\+(\d{2})\+(\d{2})/, "$1-$2-$3 ");
  }
  return n;
};

const toDate = (s) => {
  const n = normalizeTimestamp(s);
  if (!n) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (s) => {
  const d = toDate(s);
  return d ? d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : "";
};

export const formatTime = (s) => {
  const d = toDate(s);
  return d
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : "";
};

export const stripMarkdown = (text) =>
  (text || "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n\s*\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[*_]/g, "")
    .trim();

export const truncateWords = (text, maxWords) => {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text || "";
  return words.slice(0, maxWords).join(" ") + "...";
};
