// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { IoChevronBack, IoBookmarkOutline } from "react-icons/io5";
import { spacing, fontSize } from "../lib/theme";
import { useBookmarks } from "../context/BookmarkProvider";
import BookmarkCard from "../components/BookmarkCard";
import CommentModal from "../components/CommentModal";
import SharePostModal from "../components/SharePostModal.web";
import { toggleLike as apiToggleLike, incrementViewCount, trackView } from "../components/api";
import { useTheme } from "../context/ThemeProvider";
import { makeBookmarkStyles } from "../lib/bookmarkStyles";
import { useBookmarkEnforcements } from "../hooks/useBookmarkEnforcements";

export default function Bookmarks() {
  const router = useRouter();
  const { theme } = useTheme();
  const { bookmarkedPosts, loading, clearAllBookmarks, refreshBookmarks, initializeBookmarks } = useBookmarks();
  const enforcements = useBookmarkEnforcements(bookmarkedPosts);

  const [liked, setLiked] = useState(new Set());
  const [counts, setCounts] = useState({});
  const [expandedTitles, setExpandedTitles] = useState(new Set());
  const [commentItem, setCommentItem] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const s = useMemo(() => makeBookmarkStyles(theme), [theme]);

  useEffect(() => {
    initializeBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = {};
    bookmarkedPosts.forEach((p) => {
      c[p.id] = p.like_count || 0;
    });
    setCounts(c);
  }, [bookmarkedPosts]);

  const flip = (setter, id) =>
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const handleLike = async (item) => {
    const delta = liked.has(item.id) ? -1 : 1;
    flip(setLiked, item.id);
    setCounts((p) => ({ ...p, [item.id]: Math.max((p[item.id] || 0) + delta, 0) }));
    try {
      await apiToggleLike(item.id, item.type);
    } catch (e) {
      console.error("Error toggling like:", e);
      flip(setLiked, item.id);
      setCounts((p) => ({ ...p, [item.id]: Math.max((p[item.id] || 0) - delta, 0) }));
    }
  };

  const openArticle = (a) => {
    if (a.id) incrementViewCount("articles", a.id);
    router.push(`/post/${a.id}`);
  };

  const openPodcast = (p) => {
    if (p.id) {
      trackView(p.id, "podcast");
      incrementViewCount("podcasts", p.id);
    }
    router.push(`/podcastpost?id=${p.id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBookmarks();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...s.container, display: "flex", alignItems: "center", justifyContent: "center", color: theme.secondaryText }}>
        Loading bookmarks...
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.iconBtn} onClick={() => router.back()} aria-label="Back">
          <IoChevronBack size={24} color={theme.icon} />
        </button>
        <div style={{ fontSize: fontSize.lg, fontWeight: 600, color: theme.text }}>Bookmarks</div>
        <div style={{ display: "flex", gap: spacing.md }}>
          <button style={s.linkBtn} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          {bookmarkedPosts.length > 0 && (
            <button style={{ ...s.linkBtn, color: theme.secondaryText }} onClick={() => clearAllBookmarks().catch(console.error)}>
              Clear All
            </button>
          )}
        </div>
      </div>

      <div style={s.content}>
        {bookmarkedPosts.length > 0 ? (
          bookmarkedPosts.map((item, i) => (
            <div key={`${item.type}_${item.id}`}>
              <BookmarkCard
                item={item}
                theme={theme}
                s={s}
                enforcement={enforcements[`${item.id}_${item.type}`]}
                liked={liked.has(item.id)}
                likeCount={counts[item.id] ?? item.like_count ?? 0}
                expandedTitle={expandedTitles.has(item.id)}
                onLike={() => handleLike(item)}
                onToggleTitle={() => flip(setExpandedTitles, item.id)}
                onComment={() => setCommentItem(item)}
                onShare={() => setShareItem(item)}
                onOpenArticle={() => openArticle(item)}
                onOpenPodcast={() => openPodcast(item)}
              />
              {i < bookmarkedPosts.length - 1 && <div style={{ height: 1, backgroundColor: theme.border }} />}
            </div>
          ))
        ) : (
          <div style={s.empty}>
            <IoBookmarkOutline size={64} color={theme.iconSecondary || "#ccc"} />
            <div style={{ fontSize: fontSize.xl, fontWeight: 600, color: theme.text, marginTop: spacing.base }}>No Bookmarks Yet</div>
            <div style={{ color: theme.secondaryText, marginTop: spacing.sm }}>Posts you bookmark will appear here</div>
          </div>
        )}
      </div>

      <CommentModal
        visible={!!commentItem}
        onClose={() => setCommentItem(null)}
        contentId={commentItem?.id || ""}
        contentType={commentItem?.type || "article"}
      />

      <SharePostModal
        visible={!!shareItem}
        onClose={() => setShareItem(null)}
        title={shareItem?.title || shareItem?.name}
        date={shareItem?.created_at ? new Date(shareItem.created_at).toLocaleDateString() : shareItem?.date}
        postId={shareItem?.id}
        postType={shareItem?.type}
        url={`https://www.verrsa.org/${shareItem?.type}/${shareItem?.id}`}
        cover_image_url={shareItem?.cover_image_url || shareItem?.image || undefined}
        thumbnail_url={shareItem?.thumbnail_url || undefined}
        description={shareItem?.description || shareItem?.content || shareItem?.excerpt}
      />
    </div>
  );
}
