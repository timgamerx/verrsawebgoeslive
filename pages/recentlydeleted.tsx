// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { FiTrash2 } from "react-icons/fi";
import { supabase } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";
import DeletedPostCard from "../components/DeletedPostCard";
import { spacing, fontSize } from "../lib/theme";

// Posts stay in "recently deleted" for 30 days before permanent removal
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const daysRemaining = (deletedAt: string) => {
  const expiry = new Date(deletedAt).getTime() + RETENTION_DAYS * DAY_MS;
  return Math.max(Math.ceil((expiry - Date.now()) / DAY_MS), 0);
};

export default function RecentlyDeleted() {
  const router = useRouter();
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth");
          return;
        }
        const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, content, post_type, cover_image_url, deleted_at, created_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null)
          .gte("deleted_at", cutoff.toISOString())
          .order("deleted_at", { ascending: false });
        if (!error && data) setPosts(data);
      } catch (e) {
        console.error("Error fetching recently deleted posts:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRestore = async (post) => {
    if (!window.confirm(`Restore this ${post.post_type}? It will reappear on your profile.`)) return;
    try {
      setBusyId(post.id);
      const { error } = await supabase.from("posts").update({ deleted_at: null }).eq("id", post.id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      window.alert("Failed to restore post. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (post) => {
    if (!window.confirm("This will permanently delete the post. This cannot be undone.")) return;
    try {
      setBusyId(post.id);
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      window.alert("Failed to delete post. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.background }}>
      <div style={{ ...s.header, borderBottomColor: theme.border }}>
        <button onClick={() => router.back()} style={s.backBtn}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ fontSize: fontSize.lg, fontWeight: 600, color: theme.text }}>
          Recently Deleted
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={s.content}>
        {loading ? (
          <div style={{ ...s.center, color: theme.secondaryText }}>Loading…</div>
        ) : posts.length === 0 ? (
          <div style={s.center}>
            <FiTrash2 size={52} color={theme.border} />
            <div style={{ fontSize: fontSize.lg, fontWeight: 600, marginTop: spacing.base, color: theme.text }}>
              No Recently Deleted Posts
            </div>
            <div style={{ fontSize: fontSize.md, marginTop: spacing.sm, textAlign: "center", lineHeight: "22px", color: theme.secondaryText }}>
              Deleted posts appear here for {RETENTION_DAYS} days before being permanently removed.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: fontSize.sm, marginBottom: spacing.base, textAlign: "center", color: theme.secondaryText }}>
              Posts are automatically deleted after {RETENTION_DAYS} days.
            </div>
            {posts.map((post) => (
              <DeletedPostCard
                key={post.id}
                post={post}
                remaining={daysRemaining(post.deleted_at)}
                busy={busyId === post.id}
                theme={theme}
                onRestore={() => handleRestore(post)}
                onDelete={() => handlePermanentDelete(post)}
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px`,
    borderBottom: "1px solid",
  },
  backBtn: { background: "none", border: "none", cursor: "pointer", padding: spacing.xs },
  content: { maxWidth: 700, margin: "0 auto", padding: spacing.base, boxSizing: "border-box" },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl3,
  },
};
