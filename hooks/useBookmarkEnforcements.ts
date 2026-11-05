// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "../components/supabase";

// Loads moderation/enforcement labels for bookmarked posts (labels only, no filtering)
export function useBookmarkEnforcements(posts) {
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const types = ["article", "podcast", "video"];
    (async () => {
      try {
        const results = await Promise.all(
          types.map((t) => {
            const ids = posts.filter((p) => p.type === t).map((p) => p.id);
            return ids.length
              ? supabase
                  .from("post_enforcement_view")
                  .select("post_id, enforcement_action, title, message")
                  .eq("post_type", t)
                  .in("post_id", ids)
              : Promise.resolve({ data: [] });
          }),
        );
        const next = {};
        results.forEach((res, i) =>
          (res.data || []).forEach((r) => {
            if (r.enforcement_action && r.enforcement_action !== "none") {
              next[`${r.post_id}_${types[i]}`] = {
                action: r.enforcement_action,
                title: r.title || undefined,
                message: r.message || undefined,
              };
            }
          }),
        );
        setMap(next);
      } catch (e) {
        console.warn("Bookmarks: enforcement load failed", e);
      }
    })();
  }, [posts]);

  return map;
}
