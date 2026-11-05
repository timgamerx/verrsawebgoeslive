// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack, IoLockClosed, IoLockOpenOutline, IoMailOpenOutline } from "react-icons/io5";
import { supabase } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";
import { useSubscription } from "../hooks/useSubscription";
import NewsletterCard from "../components/NewsletterCard";
import { spacing, radius, fontSize } from "../lib/theme";
import { stripMarkers } from "../lib/richText";

const FREE_NEWSLETTER_LIMIT = 3;
const SUBSCRIBE_ROUTE = "/verrsasubscription";
const preview = (body: string) =>
  stripMarkers(body || "").slice(0, 110);

// Weekly newsletters. Newest 3 are free; older ones need Basic/Premium.
export default function Newsletters() {
  const router = useRouter();
  const { theme } = useTheme();
  const { subscription } = useSubscription();
  const isPaid = subscription?.plan === "basic" || subscription?.plan === "premium";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("verrsa_newsletters")
        .select("id, subject, body, cta_text, cta_url, image_url, sent_at")
        .order("sent_at", { ascending: false });
      if (error) console.error("Newsletter load error:", error);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const isLocked = (i: number) => !isPaid && i >= FREE_NEWSLETTER_LIMIT;
  const open = (item, i: number) =>
    router.push(isLocked(i) ? SUBSCRIBE_ROUTE : `/newsletter/${item.id}`);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.background }}>
      <div style={{ ...s.header, borderBottomColor: theme.border }}>
        <button onClick={() => router.back()} style={s.iconBtn}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ fontSize: fontSize.lg, fontWeight: 600, color: theme.text }}>Newsletters</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={s.content}>
        {loading ? (
          <div style={{ ...s.center, color: theme.secondaryText }}>Loading…</div>
        ) : (
          <>
            {!isPaid && items.length > FREE_NEWSLETTER_LIMIT && (
              <div
                onClick={() => router.push(SUBSCRIBE_ROUTE)}
                style={{ ...s.banner, backgroundColor: theme.cardBackground, borderColor: theme.accent }}
              >
                <IoLockOpenOutline size={20} color={theme.accent} />
                <div style={{ color: theme.text, flex: 1, marginLeft: 10 }}>
                  The latest {FREE_NEWSLETTER_LIMIT} newsletters are free. Upgrade to
                  Basic or Premium to unlock the full library.
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div style={s.center}>
                <IoMailOpenOutline size={48} color={theme.secondaryText} />
                <div style={{ color: theme.text, marginTop: 10, fontSize: fontSize.base }}>
                  No newsletters yet
                </div>
                <div style={{ color: theme.secondaryText }}>
                  Our weekly newsletters will appear here
                </div>
              </div>
            )}

            {items.map((item, i) => (
              <NewsletterCard
                key={item.id}
                item={item}
                locked={isLocked(i)}
                isPaid={isPaid}
                theme={theme}
                onOpen={() => open(item, i)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px`, borderBottom: "1px solid",
  },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4 },
  content: { maxWidth: 700, margin: "0 auto", padding: spacing.base, paddingBottom: spacing.xl5, boxSizing: "border-box" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 },
  banner: {
    display: "flex", alignItems: "center", padding: spacing.md, borderRadius: radius.md,
    border: "1px solid", marginBottom: spacing.base, cursor: "pointer",
  },
};
