// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { supabase } from "../../components/supabase";
import { useTheme } from "../../context/ThemeProvider";
import { useSubscription } from "../../hooks/useSubscription";
import { spacing, radius, fontSize } from "../../lib/theme";
import { parseBody } from "../../lib/richText";

const FREE_NEWSLETTER_LIMIT = 3;

export default function NewsletterPost() {
  const router = useRouter();
  const { id } = router.query;
  const { theme } = useTheme();
  const { subscription, loading: subLoading } = useSubscription();
  const isPaid =
    subscription?.plan === "basic" || subscription?.plan === "premium";

  const [newsletter, setNewsletter] = useState(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "locked">("loading");

  useEffect(() => {
    if (!id || subLoading) return;
    (async () => {
      const { data, error } = await supabase
        .from("verrsa_newsletters")
        .select("id, subject, body, cta_text, cta_url, image_url, sent_at")
        .order("sent_at", { ascending: false });
      if (error || !data) {
        setState("missing");
        return;
      }
      const index = data.findIndex((n) => n.id === id);
      if (index === -1) {
        setState("missing");
      } else if (!isPaid && index >= FREE_NEWSLETTER_LIMIT) {
        setState("locked");
      } else {
        setNewsletter(data[index]);
        setState("ok");
      }
    })();
  }, [id, isPaid, subLoading]);

  useEffect(() => {
    if (state === "locked") router.replace("/verrsasubscription");
  }, [state]);

  return (
    <div style={{ ...styles.container, backgroundColor: theme.background }}>
      <div style={{ ...styles.header, borderBottomColor: theme.border }}>
        <button onClick={() => router.back()} style={styles.iconBtn}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ ...styles.headerTitle, color: theme.text }}>Newsletter</div>
        <div style={{ width: 32 }} />
      </div>

      {state === "missing" && (
        <div style={{ color: theme.text, padding: spacing.lg }}>Newsletter not found.</div>
      )}

      {state === "ok" && newsletter && (
        <div style={styles.content}>
          {newsletter.image_url ? (
            <img src={newsletter.image_url} alt="" style={styles.cover} />
          ) : null}
          <div style={{ padding: spacing.lg }}>
            <div style={{ ...styles.date, color: theme.secondaryText }}>
              {new Date(newsletter.sent_at).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1 style={{ ...styles.title, color: theme.text }}>{newsletter.subject}</h1>
            <div style={{ ...styles.body, color: theme.text }}>
              {parseBody(newsletter.body).map((line, i) => {
                if (line.type === "blank") return <div key={i} style={{ height: 12 }} />;
                const content = line.segments.map((s, j) => {
                  let node: React.ReactNode = s.text;
                  if (s.italic) node = <em key={`e${j}`}>{node}</em>;
                  if (s.bold) node = <strong key={`b${j}`}>{node}</strong>;
                  return <React.Fragment key={j}>{node}</React.Fragment>;
                });
                if (line.type === "li") {
                  return (
                    <div key={i} style={{ display: "flex", paddingLeft: 8, marginBottom: 4 }}>
                      <span style={{ width: 24, flexShrink: 0 }}>{line.marker}</span>
                      <span style={{ flex: 1 }}>{content}</span>
                    </div>
                  );
                }
                return <div key={i}>{content}</div>;
              })}
            </div>

            {newsletter.cta_url ? (
              <a
                href={newsletter.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.cta, backgroundColor: theme.accent }}
              >
                {newsletter.cta_text || "Learn more"}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px`,
    borderBottom: "1px solid",
  },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: 600 },
  content: { maxWidth: 700, margin: "0 auto", paddingBottom: spacing.xl5 },
  cover: { width: "100%", height: 220, objectFit: "cover", display: "block" },
  date: { fontSize: fontSize.sm, marginBottom: 8 },
  title: { fontSize: fontSize.xl, fontWeight: 700, margin: `0 0 ${spacing.base}px` },
  body: { fontSize: fontSize.base, lineHeight: "26px", whiteSpace: "pre-wrap" },
  cta: {
    display: "block",
    marginTop: spacing.xl,
    padding: "14px 0",
    borderRadius: radius.xl2,
    textAlign: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: fontSize.base,
    textDecoration: "none",
  },
};
