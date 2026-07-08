import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import {
  IoThumbsUpOutline,
  IoThumbsUp,
  IoBookmarkOutline,
  IoMailOutline,
  IoChevronBack,
  IoVolumeMuteOutline,
  IoPlayOutline,
  IoMicOutline,
  IoArrowForward,
  IoClose,
  IoPersonAddOutline,
  IoCheckmark,
  IoWalletOutline,
} from "react-icons/io5";
import { MdAnalytics, MdMoreVert, MdBlock } from "react-icons/md";
import {
  FiMessageCircle,
  FiShare2,
  FiMapPin,
  FiLink,
  FiCalendar,
  FiFileText,
  FiUsers,
  FiUserPlus,
  FiAlertCircle,
  FiFlag,
  FiSlash,
} from "react-icons/fi";
import { HiDotsHorizontal } from "react-icons/hi";
import MetaTags from '../../components/MetaTags';
import VerificationBadge from '../../components/VerificationBadge';
import { supabase } from '../../components/supabase';
import { getActiveModerationExclusions } from '../../lib/moderationExclusions';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.verrsa.org';

// ── Video player ───────────────────────────────────────────────────────────────
const VideoPost = ({ videoUrl, thumbnailUrl }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) videoRef.current.pause();
    };
  }, [videoUrl]);

  if (!videoUrl && !thumbnailUrl) {
    return (
      <div style={styles.placeholderVideo}>
        <IoPlayOutline size={40} color="#ccc" />
        <p style={styles.placeholderText}>Video not available</p>
      </div>
    );
  }

  return (
    <div style={styles.videoWrapper}>
      <video
        ref={videoRef}
        src={videoUrl || thumbnailUrl}
        style={styles.videoPlayer}
        poster={thumbnailUrl || videoUrl}
        loop
        muted
        playsInline
      />
      <div style={styles.muteIndicator}>
        <IoVolumeMuteOutline size={18} color="#fff" />
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UserProfile({ initialMeta, initialProfile, isOwnProfile: initialIsOwnProfile }) {
  const router = useRouter();
  const { userId } = router.query;
  const [isOwnProfile, setIsOwnProfile] = useState(initialIsOwnProfile || false);

  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(initialProfile || null);
  const [userPosts, setUserPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [showReportMenu, setShowReportMenu] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    checkIfOwnProfile();
    init();
  }, [userId]);

  const checkIfOwnProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && session.user.id === userId) {
      setIsOwnProfile(true);
    }
  };

  const init = async () => {
    await fetchCurrentUser();
    await Promise.all([
      fetchUserProfile(),
      fetchStats(),
      fetchUserPosts(),
      fetchFollowers(),
      fetchFollowing(),
      checkIfFollowing(),
      fetchCurrentUserFollowing(),
    ]);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);
  };

  // ── Profile ───────────────────────────────────────────────────────────────
  const fetchUserProfile = async () => {
    const { excludedUserIds } = await getActiveModerationExclusions();
    if (excludedUserIds.has(String(userId || ""))) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();
    if (excludedUserIds.has(String(userId || ""))) {
      setStats({ postsCount: 0, followersCount: 0, followingCount: 0 });
      return;
    }

    const [{ data: postsRows }, { count: followersCount }, { count: followingCount }] =
      await Promise.all([
        supabase
          .from("posts")
          .select("id, post_type, user_id")
          .eq("user_id", userId)
          .in("post_type", ["article", "podcast", "video", "verse"]),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);
    const visiblePostsCount = (postsRows || []).filter((p) => {
      const key = `${p.id}_${p.post_type}`;
      return (
        !excludedUserIds.has(String(p.user_id || "")) &&
        !excludedPostKeys.has(key)
      );
    }).length;

    setStats({
      postsCount: visiblePostsCount || 0,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
    });
  };

  // ── Posts ─────────────────────────────────────────────────────────────────
  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    setPostsError(null);
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    if (excludedUserIds.has(String(userId || ""))) {
      setUserPosts([]);
      setLoadingPosts(false);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles:user_id(full_name, username, avatar_url, is_verified)")
      .eq("user_id", userId)
      .in("post_type", ["article", "podcast", "video", "verse"])
      .order("created_at", { ascending: false });

    if (error) {
      setPostsError("Failed to load posts");
    } else {
      setUserPosts(
        (data || [])
          .filter((p) => {
            const key = `${p.id}_${p.post_type}`;
            return (
              !excludedUserIds.has(String(p.user_id || "")) &&
              !excludedPostKeys.has(key)
            );
          })
          .map((p) => ({ ...p, type: p.post_type })),
      );
    }
    setLoadingPosts(false);
  };

  // ── Followers / Following ─────────────────────────────────────────────────
  const fetchFollowers = async () => {
    const { excludedUserIds } = await getActiveModerationExclusions();
    const { data } = await supabase
      .from("follows")
      .select("follower_id, profiles:follower_id(id, username, full_name, avatar_url, bio)")
      .eq("following_id", userId);
    setFollowers(
      (data || [])
        .filter((d) => !excludedUserIds.has(String(d.follower_id || "")))
        ?.flatMap((d) => (Array.isArray(d.profiles) ? d.profiles : [d.profiles]))
        .filter(Boolean) || []
    );
  };

  const fetchFollowing = async () => {
    const { excludedUserIds } = await getActiveModerationExclusions();
    const { data } = await supabase
      .from("follows")
      .select("following_id, profiles:following_id(id, username, full_name, avatar_url, bio)")
      .eq("follower_id", userId);
    setFollowing(
      (data || [])
        .filter((d) => !excludedUserIds.has(String(d.following_id || "")))
        ?.flatMap((d) => (Array.isArray(d.profiles) ? d.profiles : [d.profiles]))
        .filter(Boolean) || []
    );
  };

  const fetchCurrentUserFollowing = async () => {
    const { excludedUserIds } = await getActiveModerationExclusions();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", session.user.id);
    setFollowingUsers(
      new Set(
        (data || [])
          .map((d) => d.following_id)
          .filter((id) => !excludedUserIds.has(String(id || ""))),
      ),
    );
  };

  const checkIfFollowing = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", session.user.id)
      .eq("following_id", userId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  // ── Follow toggle ─────────────────────────────────────────────────────────
  const handleFollowToggle = async (targetUserId) => {
    const uid = targetUserId || userId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    if (session.user.id === uid) { alert("You cannot follow yourself"); return; }

    setFollowLoading(true);
    const alreadyFollowing = targetUserId ? followingUsers.has(targetUserId) : isFollowing;

    if (alreadyFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", session.user.id)
        .eq("following_id", uid);
      if (!targetUserId) {
        setIsFollowing(false);
        setStats((p) => ({ ...p, followersCount: Math.max(p.followersCount - 1, 0) }));
      }
      setFollowingUsers((prev) => { const s = new Set(prev); s.delete(uid); return s; });
    } else {
      await supabase.from("follows").insert({ follower_id: session.user.id, following_id: uid });
      if (!targetUserId) {
        setIsFollowing(true);
        setStats((p) => ({ ...p, followersCount: p.followersCount + 1 }));
      }
      setFollowingUsers((prev) => new Set(prev).add(uid));
    }

    if (targetUserId) {
      fetchFollowers();
      fetchFollowing();
    }
    setFollowLoading(false);
  };

  // ── Like toggle ───────────────────────────────────────────────────────────
  const handleToggleLike = async (postId, postType) => {
    const isLiked = likedPosts.has(postId);
    setLikedPosts((prev) => {
      const s = new Set(prev);
      isLiked ? s.delete(postId) : s.add(postId);
      return s;
    });
    setUserPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + (isLiked ? -1 : 1) } : p
      )
    );
  };

  // ── Report ────────────────────────────────────────────────────────────────
  const handleReportPost = async (post) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { alert("You must be logged in to report content"); return; }
    const reason = window.prompt("Why are you reporting this post?\n(Spam / Inappropriate / Harassment / Other)");
    if (!reason) return;
    await supabase.from("reported_posts").insert({
      post_id: post.id,
      post_type: post.type,
      reported_by: session.user.id,
      reason,
    });
    alert("Thank you for your report. We'll review it shortly.");
  };

  const handleReportUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { alert("You must be logged in to report users"); return; }
    if (session.user.id === userId) { alert("You cannot report yourself"); return; }
    const reason = window.prompt("Why are you reporting this user?\n(Spam / Inappropriate / Harassment / Fake Account / Other)");
    if (!reason) return;
    await supabase.from("reported_users").insert({
      reported_user_id: userId,
      reported_by: session.user.id,
      reason,
    });
    alert("Thank you for your report. We'll review it shortly.");
  };

  const handleBlockUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { alert("You must be logged in to block users"); return; }
    if (session.user.id === userId) { alert("You cannot block yourself"); return; }
    if (!window.confirm("You won't see content from this user. Block them?")) return;
    await supabase.from("blocked_users").insert({ blocked_user_id: userId, blocked_by: session.user.id });
    alert("User has been blocked.");
    router.back();
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareProfile = () => setShowShareModal(true);

  // ── Message ───────────────────────────────────────────────────────────────
  const handleMessage = () => router.push(`/chat/${userId}`);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const truncate = (text, words) => {
    if (!text) return "";
    const stripped = text
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/[*_]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    const parts = stripped.split(/\s+/);
    return parts.length <= words ? stripped : parts.slice(0, words).join(" ") + "...";
  };

  // ── Render post ───────────────────────────────────────────────────────────
  const renderPost = (item) => {
    const userName = item.profiles?.full_name || profile?.full_name || "Creator";
    const userAvatar = item.profiles?.avatar_url || profile?.avatar_url || "/avatar.jpg";
    const likeCount = item.like_count || 0;
    const commentCount = item.comment_count || item.comments || 0;


 

    return (
      <div key={item.id} style={styles.postCard}>
        {/* Header */}
        <div style={styles.postHeader}>
          <img
            src={userAvatar}
            alt="Avatar"
            style={styles.postAvatar}
            onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.jpg"; }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={styles.postUserName}>{userName}</span>
              {(item.profiles?.is_verified || profile?.is_verified) && (
                <VerificationBadge size={15} />
              )}
            </div>
            <span style={styles.postTime}>{formatTime(item.created_at)}</span>
          </div>

          {/* Dots menu */}
          <div style={{ position: "relative" }}>
            <button
              style={styles.iconButton}
              onClick={() => setShowReportMenu(showReportMenu === item.id ? null : item.id)}
            >
              <HiDotsHorizontal size={16} color="#888" />
            </button>
            {showReportMenu === item.id && (
              <>
                <div
                  style={styles.menuOverlay}
                  onClick={() => setShowReportMenu(null)}
                />
                <div style={styles.dropdownMenu}>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => { setShowReportMenu(null); handleBlockUser(); }}
                  >
                    <FiSlash size={18} color="#FF3B30" />
                    <span style={{ color: "#FF3B30", marginLeft: "10px" }}>Block User</span>
                  </button>
                  <div style={styles.menuDivider} />
                  <button
                    style={styles.dropdownItem}
                    onClick={() => { setShowReportMenu(null); handleReportPost(item); }}
                  >
                    <FiFlag size={18} color="#FF3B30" />
                    <span style={{ color: "#FF3B30", marginLeft: "10px" }}>Report Post</span>
                  </button>
                  <div style={styles.menuDivider} />
                  <button
                    style={styles.dropdownItem}
                    onClick={() => { setShowReportMenu(null); handleReportUser(); }}
                  >
                    <FiAlertCircle size={18} color="#FF3B30" />
                    <span style={{ color: "#FF3B30", marginLeft: "10px" }}>Report User</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        {item.type !== "verse" && item.title && (
          <h3 style={styles.postTitle}>
            {item.title
              .replace(/\*\*(.+?)\*\*/g, "$1")
              .replace(/\*(.+?)\*/g, "$1")
              .replace(/[*_]/g, "")}
          </h3>
        )}

        {/* Article */}
        {item.type === "article" && (
          <div style={{ marginBottom: "12px", cursor: "pointer" }} onClick={() => router.push(`/post/${item.id}`)}>
             <p style={styles.postText}>{truncate(item.content || item.description, 25)}</p>
            {item.cover_image_url && (
              <img src={item.cover_image_url} alt="" style={styles.thumbnail} />
            )}
           
          </div>
        )}

        {/* Video */}
        {item.type === "video" && (
          <div style={styles.fullWidthVideo}>
            <VideoPost videoUrl={item.video_url || item.video} thumbnailUrl={item.thumbnail_url} />
          </div>
        )}

        {/* Podcast */}
        {item.type === "podcast" && (
          <div>
            <p style={styles.postText}>{truncate(item.description || item.content, 20)}</p>
            {item.cover_image_url && (
              <img src={item.cover_image_url} alt="" style={styles.thumbnail} />
            )}
          </div>
        )}

        {/* Verse */}
        {item.type === "verse" && (
          <div style={styles.verseContainer}>
            <p style={styles.verseText}>{item.content}</p>
            {item.image_url && (
              <img src={item.image_url} alt="" style={styles.verseImage} />
            )}
          </div>
        )}

        {/* Actions */}
        <div style={styles.iconRow}>
          <button style={styles.iconButton} onClick={() => handleToggleLike(item.id, item.type)}>
            {likedPosts.has(item.id) ? (
              <IoThumbsUp size={18} color="#00BFFF" />
            ) : (
              <IoThumbsUpOutline size={18} color="#666" />
            )}
          </button>
          <span style={styles.countText}>{likeCount}</span>

          <MdAnalytics size={18} color="#999" style={{ marginLeft: "8px" }} />
          <span style={styles.countText}>{item.view_count || 0}</span>

          <button style={{ ...styles.iconButton, marginLeft: "8px" }}>
            <FiMessageCircle size={18} color="#666" />
          </button>
          <span style={styles.countText}>{commentCount}</span>

          <button style={{ ...styles.iconButton, marginLeft: "8px" }}>
            <IoBookmarkOutline size={18} color="#666" />
          </button>

          <button style={{ ...styles.iconButton, marginLeft: "8px" }}>
            <FiShare2 size={18} color="#666" />
          </button>

          <span style={{ ...styles.countText, marginLeft: "auto" }}>
            {item.created_at ? formatDate(item.created_at) : ""}
          </span>

          {/* Read more circle */}
          {item.type === "article" && (
            <div style={styles.readMoreCircle}>
              <IoArrowForward size={13} color="#00BFFF" />
            </div>
          )}
          {item.type === "video" && (
            <div style={{ ...styles.readMoreCircle, borderColor: "#FF6347" }}>
              <IoPlayOutline size={13} color="#FF6347" />
            </div>
          )}
          {item.type === "podcast" && (
            <div style={{ ...styles.readMoreCircle, borderColor: "#32CD32" }}>
              <IoMicOutline size={13} color="#32CD32" />
            </div>
          )}
        </div>

        <div style={styles.postDivider} />
      </div>
    );
  };

  // ── Render follower item ───────────────────────────────────────────────────
  const renderFollower = (item) => {
    const isCurrentUser = currentUser?.id === item.id;
    const isAlreadyFollowing = followingUsers.has(item.id);

    return (
      <div
        key={item.id}
        style={styles.followerCard}
        onClick={() => router.push(`/user/${item.id}`)}
      >
        <img
          src={item.avatar_url || "/avatar.jpg"}
          alt="Avatar"
          style={styles.followerAvatar}
          onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.jpg"; }}
        />
        <div style={{ flex: 1 }}>
          <span style={styles.followerName}>{item.full_name || item.username}</span>
          <p style={styles.followerBio}>{item.bio || "Verrsa Creator"}</p>
        </div>
        {!isCurrentUser && (
          <button
            style={isAlreadyFollowing ? styles.followingBtn : styles.followBtn}
            onClick={(e) => { e.stopPropagation(); handleFollowToggle(item.id); }}
          >
            {isAlreadyFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
    );
  };

  // ── Tab content ───────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === "Posts") {
      if (loadingPosts) {
        return (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <p style={styles.emptyText}>Loading posts...</p>
          </div>
        );
      }
      if (postsError) {
        return (
          <div style={styles.emptyState}>
            <FiAlertCircle size={48} color="#ff6b6b" />
            <p style={{ ...styles.emptyText, color: "#ff6b6b" }}>{postsError}</p>
            <button style={styles.retryBtn} onClick={fetchUserPosts}>Try Again</button>
          </div>
        );
      }
      if (userPosts.length === 0) {
        return (
          <div style={styles.emptyState}>
            <FiFileText size={48} color="#ccc" />
            <p style={styles.emptyText}>No posts yet</p>
            <p style={styles.emptySubText}>This user hasn't shared any content yet.</p>
          </div>
        );
      }
      return userPosts.map(renderPost);
    }

    if (activeTab === "Followers") {
      return followers.length > 0 ? followers.map(renderFollower) : (
        <div style={styles.emptyState}>
          <FiUsers size={48} color="#ccc" />
          <p style={styles.emptyText}>No followers yet</p>
        </div>
      );
    }

    if (activeTab === "Following") {
      return following.length > 0 ? following.map(renderFollower) : (
        <div style={styles.emptyState}>
          <FiUserPlus size={48} color="#ccc" />
          <p style={styles.emptyText}>Not following anyone yet</p>
        </div>
      );
    }

    if (activeTab === "About") {
      return (
        <div style={{ padding: "20px 16px" }}>
          <h3 style={styles.sectionTitle}>About</h3>
          <p style={styles.aboutText}>{profile?.bio || "No bio available."}</p>

          {profile?.skills && profile.skills.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>Skills</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {profile.skills.map((skill, i) => (
                  <span key={i} style={styles.skillBadge}>{skill}</span>
                ))}
              </div>
            </>
          )}

          {profile?.location && (
            <div style={styles.infoRow}>
              <FiMapPin size={16} color="#666" />
              <span style={styles.infoText}>{profile.location}</span>
            </div>
          )}

          {profile?.website && (
            <div style={styles.infoRow}>
              <FiLink size={16} color="#00BFFF" />
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.infoText, color: "#00BFFF" }}
              >
                {profile.website}
              </a>
            </div>
          )}

          {profile?.created_at && (
            <div style={styles.infoRow}>
              <FiCalendar size={16} color="#666" />
              <span style={styles.infoText}>
                Joined{" "}
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const profileUsername = profile?.username || "";
  const profileImage = profile?.avatar_url || "https://ik.imagekit.io/te9biwxvl/verrsa-team.png";

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

     

      <Head>
        <title>{initialMeta?.title || (profile?.full_name ? `${profile.full_name} - Verrsa` : 'Verrsa')}</title>
        <meta name="description" content={initialMeta?.description || (profile?.full_name ? `View ${profile.full_name}'s profile on Verrsa.` : 'View this creator profile on Verrsa.')} />
        <link rel="canonical" href={initialMeta?.url || `${SITE_URL}/user/${userId || ''}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Verrsa" />
        <meta property="og:url" content={initialMeta?.url || `${SITE_URL}/user/${userId || ''}`} />
        <meta property="og:title" content={initialMeta?.title || (profile?.full_name ? `${profile.full_name} - Verrsa` : 'Verrsa')} />
        <meta property="og:description" content={initialMeta?.description || (profile?.full_name ? `View ${profile.full_name}'s profile on Verrsa.` : 'View this creator profile on Verrsa.')} />
        <meta property="og:image" content={initialMeta?.image || profileImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={initialMeta?.url || `${SITE_URL}/user/${userId || ''}`} />
        <meta name="twitter:title" content={initialMeta?.title || (profile?.full_name ? `${profile.full_name} - Verrsa` : 'Verrsa')} />
        <meta name="twitter:description" content={initialMeta?.description || (profile?.full_name ? `View ${profile.full_name}'s profile on Verrsa.` : 'View this creator profile on Verrsa.')} />
        <meta name="twitter:image" content={initialMeta?.image || profileImage} />
      </Head>
      <MetaTags
        title={initialMeta?.title || (profile?.full_name ? `${profile.full_name} - Verrsa` : 'Verrsa')}
        description={initialMeta?.description || (profile?.full_name ? `View ${profile.full_name}'s profile on Verrsa.` : profile?.bio || 'View this creator profile on Verrsa.')}
        image={initialMeta?.image || profileImage}
        url={initialMeta?.url || `${SITE_URL}/user/${userId || ''}`}
        type="website"
      />
      <div style={styles.container}>
      {/* Fixed Header */}
      <div style={styles.fixedHeader}>
        <button style={styles.backButton} onClick={() => router.back()}>
          <IoChevronBack size={24} color="#111" />
        </button>

        <h1 style={styles.headerTitle}>
          {profile?.username || profile?.email?.split("@")[0] || "Profile"}
        </h1>

        {/* Header icons */}
        <div style={styles.headerIcons}>
          <button style={styles.iconButton} onClick={shareProfile}>
            <FiShare2 size={19} color="#666" />
          </button>
          <div style={{ position: "relative" }}>
            <button
              style={styles.iconButton}
              onClick={() => setShowHeaderMenu((p) => !p)}
            >
              <MdMoreVert size={21} color="#666" />
            </button>
            {showHeaderMenu && (
              <>
                <div style={styles.menuOverlay} onClick={() => setShowHeaderMenu(false)} />
                <div style={{ ...styles.dropdownMenu, top: "36px", right: 0, minWidth: "180px" }}>
                  <button style={styles.dropdownItem} onClick={() => { setShowHeaderMenu(false); shareProfile(); }}>
                    <FiShare2 size={18} color="#333" />
                    <span style={{ marginLeft: "10px", color: "#333" }}>Share Profile</span>
                  </button>
                  {!isOwnProfile && (
                    <>
                      <div style={styles.menuDivider} />
                      <button style={styles.dropdownItem} onClick={() => { setShowHeaderMenu(false); handleMessage(); }}>
                        <IoMailOutline size={18} color="#333" />
                        <span style={{ marginLeft: "10px", color: "#333" }}>Message</span>
                      </button>
                      <div style={styles.menuDivider} />
                      <button style={styles.dropdownItem} onClick={() => { setShowHeaderMenu(false); handleFollowToggle(userId); }}>
                        {isFollowing ? (
                          <IoCheckmark size={18} color="#00BFFF" />
                        ) : (
                          <IoPersonAddOutline size={18} color="#333" />
                        )}
                        <span style={{ marginLeft: "10px", color: isFollowing ? "#00BFFF" : "#333" }}>
                          {isFollowing ? "Unfollow" : "Follow"}
                        </span>
                      </button>
                      <div style={styles.menuDivider} />
                      <button style={styles.dropdownItem} onClick={() => { setShowHeaderMenu(false); handleReportUser(); }}>
                        <FiFlag size={18} color="#FF3B30" />
                        <span style={{ marginLeft: "10px", color: "#FF3B30" }}>Report User</span>
                      </button>
                      <div style={styles.menuDivider} />
                      <button style={styles.dropdownItem} onClick={() => { setShowHeaderMenu(false); handleBlockUser(); }}>
                        <MdBlock size={18} color="#D32F2F" />
                        <span style={{ marginLeft: "10px", color: "#D32F2F" }}>Block User</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={styles.scrollContent}>
        {/* Profile section */}
        <div style={styles.profileSection}>
          <img
            src={profile?.avatar_url || "/avatar.jpg"}
            alt="Profile"
            style={styles.avatar}
            onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.jpg"; }}
          />
          <div style={styles.profileInfo}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={styles.name}>{profile?.full_name || "Creator"}</h2>
              {profile?.is_verified && <VerificationBadge size={20} />}
            </div>
            <p style={styles.usernameText}>@{profile?.username || "username"}</p>
            <p style={styles.follow}>
              {stats.postsCount} {stats.postsCount === 1 ? "Post" : "Posts"} •{" "}
              {stats.followersCount} {stats.followersCount === 1 ? "Follower" : "Followers"} •{" "}
              {stats.followingCount} Following
            </p>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && <p style={styles.bioText}>{profile.bio}</p>}

        {/* Action row */}
        <div style={styles.actionRow}>
          {!isOwnProfile && (
            <button
              style={isFollowing ? styles.followingButton : styles.followButton}
              onClick={() => handleFollowToggle(userId)}
              disabled={followLoading}
            >
              {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
            </button>
          )}
          {!isOwnProfile && (
            <button style={styles.messageButton} onClick={handleMessage}>
              <IoMailOutline size={22} color="#00BFFF" />
            </button>
          )}
          {isOwnProfile && (
            <>
              <button style={styles.editButton} onClick={() => router.push("/editprofileinformation")}>
                Edit Profile
              </button>
              <button style={styles.iconButtonCircle} onClick={() => router.push("/balance")}>
                <IoWalletOutline size={22} color="#333" />
              </button>
              <button style={styles.iconButtonCirclePrimary} onClick={() => router.push("/verrsachat")}>
                <IoMailOutline size={22} color="#fff" />
              </button>
            </>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          {["Posts", "About", "Followers", "Following"].map((tab) => (
            <button key={tab} style={styles.tabItem} onClick={() => setActiveTab(tab)}>
              <span style={activeTab === tab ? styles.activeTabText : styles.tabText}>{tab}</span>
              {activeTab === tab && <div style={styles.tabIndicator} />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>{renderTabContent()}</div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setShowShareModal(false)}>
              <IoClose size={24} color="#333" />
            </button>
            <h2 style={styles.modalTitle}>Share Profile</h2>
            <p style={styles.modalSubText}>
              Share {profile?.full_name || "this user"}'s profile
            </p>
            <button
              style={styles.copyButton}
              onClick={() => {
                navigator.clipboard?.writeText(
                  `https://www.verrsa.org/user/${userId}`
                );
                alert("Profile link copied!");
              }}
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const uid = String(context?.params?.userId || '');
  const fallbackMeta = {
    title: 'Verrsa',
    description: 'View this creator profile on Verrsa.',
    image: `${SITE_URL}/user?username=creator`,
    url: `${SITE_URL}/user/${uid}`,
  };

  if (!uid) {
    return { props: { initialMeta: fallbackMeta, initialProfile: null, isOwnProfile: false } };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { props: { initialMeta: fallbackMeta, initialProfile: null, isOwnProfile: false } };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if this is the user's own profile by checking the session
    const { data: { session } } = await supabase.auth.getSession();
    const isOwnProfile = session?.user?.id === uid;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('id', uid)
      .maybeSingle();

    if (!data) {
      return { props: { initialMeta: fallbackMeta, initialProfile: null, isOwnProfile: false } };
    }

    const username = data.username || 'creator';
    const fullName = data.full_name || username;
    const bio = data.bio
      ? (data.bio.length > 180 ? `${data.bio.slice(0, 177)}...` : data.bio)
      : `View ${fullName}'s profile on Verrsa.`;
    
    // Use avatar_url if available, otherwise fall back to API endpoint
    const metaImage = data.avatar_url || `${SITE_URL}/api/user?username=${encodeURIComponent(username)}`;

    return {
      props: {
        initialProfile: data,
        isOwnProfile,
        initialMeta: {
          title: `${fullName} - Verrsa`,
          description: bio,
          image: metaImage,
          url: `${SITE_URL}/user/${uid}`,
        },
      },
    };
  } catch {
    return { props: { initialMeta: fallbackMeta, initialProfile: null, isOwnProfile: false } };
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    fontFamily: "'Instrument Sans', sans-serif",
    maxWidth: "800px",
    margin: "0 auto",
  },
  fixedHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 16px 12px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #f0f0f0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#111",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  backButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  headerIcons: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: "40px",
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    padding: "20px 16px 12px",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "2px solid #00BFFF",
    objectFit: "cover",
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    marginLeft: "16px",
  },
  name: {
    fontSize: "22px",
    fontWeight: "500",
    color: "#111",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  usernameText: {
    fontSize: "15px",
    color: "#666",
    margin: "2px 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  follow: {
    fontSize: "14px",
    color: "#666",
    margin: "6px 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  bioText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#333",
    margin: "0 16px 16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "0 16px 16px",
  },
  followButton: {
    flex: 1,
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  followingButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  messageButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "1px solid #00BFFF",
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  iconButtonCircle: {
    padding: 10,
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    border: "none",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  iconButtonCirclePrimary: {
    padding: 10,
    borderRadius: "50%",
    backgroundColor: "#00BFFF",
    border: "none",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  tabRow: {
    display: "flex",
    borderBottom: "1px solid #f0f0f0",
  },
  tabItem: {
    flex: 1,
    background: "none",
    border: "none",
    padding: "12px 8px",
    cursor: "pointer",
    position: "relative",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  tabText: {
    fontSize: "15px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  activeTabText: {
    fontSize: "15px",
    color: "#00BFFF",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "30px",
    height: "3px",
    backgroundColor: "#00BFFF",
    borderRadius: "3px",
  },
  postCard: {
    padding: "16px",
    position: "relative",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    position: "relative",
  },
  postAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    marginRight: "10px",
    objectFit: "cover",
  },
  postUserName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postTime: {
    fontSize: "13px",
    color: "#666",
    display: "block",
    marginTop: "2px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postTitle: {
    fontSize: "17px",
    fontWeight: "400",
    color: "#111",
    margin: "0 0 12px",
    lineHeight: "1.4",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  thumbnail: {
    width: "100%",
    height: "200px",
    borderRadius: "8px",
    objectFit: "cover",
    marginBottom: "12px",
    display: "block",
  },
  postText: {
    fontSize: "15px",
    fontWeight: "300",
    lineHeight: "24px",
    color: "#444",
    margin: "0 0 12px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  fullWidthVideo: {
    marginLeft: "-16px",
    marginRight: "-16px",
    marginBottom: "12px",
  },
  videoWrapper: {
    position: "relative",
    width: "100%",
    height: "380px",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  muteIndicator: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: "50%",
    padding: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderVideo: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "380px",
    backgroundColor: "#f0f0f0",
  },
  placeholderText: {
    marginTop: "12px",
    color: "#999",
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  verseContainer: {
    padding: "8px 0",
  },
  verseText: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#111",
    margin: "0 0 12px",
    fontFamily: "'Instrument Sans', sans-serif",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  verseImage: {
    width: "100%",
    height: "200px",
    borderRadius: "12px",
    objectFit: "cover",
    display: "block",
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "12px",
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  countText: {
    fontSize: "15px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  readMoreCircle: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    border: "1.5px solid #00BFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  postDivider: {
    height: "1px",
    backgroundColor: "#f0f0f0",
    marginTop: "16px",
  },
  followerCard: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
  },
  followerAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    marginRight: "12px",
    objectFit: "cover",
  },
  followerName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#111",
    display: "block",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  followerBio: {
    fontSize: "13px",
    color: "#666",
    margin: "2px 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  followBtn: {
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginLeft: "auto",
    flexShrink: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  followingBtn: {
    backgroundColor: "#f0f0f0",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginLeft: "auto",
    flexShrink: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
  },
  emptyText: {
    fontSize: "16px",
    color: "#999",
    marginTop: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptySubText: {
    fontSize: "14px",
    color: "#bbb",
    marginTop: "4px",
    textAlign: "center",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #00BFFF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  retryBtn: {
    marginTop: "16px",
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "15px",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#111",
    margin: "0 0 8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  aboutText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#333",
    margin: "0 0 16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  skillBadge: {
    backgroundColor: "#e0f7ff",
    color: "#00BFFF",
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "13px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  infoText: {
    fontSize: "14px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
    textDecoration: "none",
  },
  dropdownMenu: {
    position: "absolute",
    top: "28px",
    right: 0,
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    border: "1px solid #f0f0f0",
    zIndex: 200,
    minWidth: "160px",
    overflow: "hidden",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "13px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    fontSize: "15px",
    fontFamily: "'Instrument Sans', sans-serif",
    textAlign: "left",
  },
  menuDivider: {
    height: "1px",
    backgroundColor: "#f5f5f5",
    margin: "0 12px",
  },
  menuOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 199,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "32px 24px",
    maxWidth: "400px",
    width: "90%",
    position: "relative",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: "14px",
    right: "14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111",
    margin: "0 0 8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalSubText: {
    fontSize: "15px",
    color: "#666",
    margin: "0 0 20px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  copyButton: {
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 32px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};