// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { supabase } from "../components/supabase";
import { joinLiveVideo, leaveLiveVideo } from "../lib/liveVideo";

/** Live room state for a community: stream, comments, viewers, likes, video. */
export const useCommunityLive = (communityId?: string) => {
  const liveId = `community-${communityId}-live`;
  const [user, setUser] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<any>(null);
  const likesChannel = useRef<any>(null);
  const likeRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const localRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    likeRef.current = likeCount;
  }, [likeCount]);

  const countViewers = async () => {
    const { count } = await supabase
      .from("live_viewers")
      .select("*", { count: "exact", head: true })
      .eq("live_id", liveId);
    setViewerCount(count || 0);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("live_comments")
      .select("*, profiles:user_id (full_name, username, avatar_url)")
      .eq("live_id", liveId)
      .order("created_at", { ascending: false })
      .limit(7);
    setComments(data ? data.reverse() : []);
  };

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    const subs: any[] = [];

    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u || cancelled) return;
      setUser(u);
      userIdRef.current = u.id;

      const { data: c } = await supabase
        .from("community")
        .select("created_by, name, description, cover_image_url, profiles:created_by(id, full_name, username)")
        .eq("id", communityId)
        .single();
      setCommunity(c);
      const owner = !!c && c.created_by === u.id;
      setIsOwner(owner);

      const { data: existing } = await supabase
        .from("live_streams")
        .select("*")
        .eq("community_id", communityId)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        setLiveStreamId(existing.id);
        setLikeCount(existing.like_count || 0);
      } else if (owner) {
        const { data: created } = await supabase
          .from("live_streams")
          .insert({
            community_id: communityId,
            streamer_id: u.id,
            title: "Community Live Stream",
            is_active: true,
            like_count: 0,
            viewer_count: 0,
          })
          .select()
          .single();
        if (created) setLiveStreamId(created.id);
      } else {
        setEnded(true);
        return;
      }

      await loadComments();
      subs.push(
        supabase
          .channel(`web-live-comments-${liveId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_comments", filter: `live_id=eq.${liveId}` }, loadComments)
          .subscribe(),
        supabase
          .channel(`web-live-viewers-${liveId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "live_viewers", filter: `live_id=eq.${liveId}` }, countViewers)
          .subscribe(),
      );
      // Same broadcast channel as mobile: likes update instantly everywhere
      const likes = supabase
        .channel(`live-likes-${liveId}`)
        .on("broadcast", { event: "like" }, (m) => {
          const n = Number(m?.payload?.count);
          if (!Number.isNaN(n) && n > likeRef.current) setLikeCount(n);
        })
        .subscribe();
      likesChannel.current = likes;
      subs.push(likes);

      await supabase.from("live_viewers").insert({ live_id: liveId, viewer_id: u.id, user_id: u.id });
      countViewers();
      videoRef.current = await joinLiveVideo(communityId, owner, localRef.current, setRemoteUsers);
    })();

    return () => {
      cancelled = true;
      subs.forEach((s) => supabase.removeChannel(s));
      leaveLiveVideo(videoRef.current);
      if (userIdRef.current) {
        supabase.from("live_viewers").delete().eq("live_id", liveId).eq("viewer_id", userIdRef.current);
      }
    };
  }, [communityId]);

  const sendComment = async (text: string) => {
    if (!text.trim() || !user) return;
    await supabase.from("live_comments").insert({ live_id: liveId, user_id: user.id, content: text.trim() });
    loadComments();
  };

  const sendLike = async () => {
    const n = likeRef.current + 1;
    likeRef.current = n;
    setLikeCount(n);
    likesChannel.current?.send({ type: "broadcast", event: "like", payload: { count: n } });
    if (liveStreamId) {
      await supabase
        .from("live_streams")
        .update({ like_count: n, updated_at: new Date().toISOString() })
        .eq("id", liveStreamId);
    }
  };

  const endLive = async () => {
    if (!isOwner) return;
    if (liveStreamId) {
      await supabase
        .from("live_streams")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", liveStreamId);
    }
    await leaveLiveVideo(videoRef.current);
    setEnded(true);
  };

  return {
    user, community, isOwner, comments, viewerCount, likeCount, remoteUsers,
    ended, localRef, sendComment, sendLike, endLive,
  };
};
