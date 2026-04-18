// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import {
  IoThumbsUpOutline,
  IoThumbsUp,
  IoBookmarkOutline,
  IoShareSocialOutline,
  IoWalletOutline,
  IoMailOutline,
  IoChevronBack,
  IoVolumeMuteOutline,
  IoPlayOutline,
  IoMicOutline,
  IoArrowForward,
  IoClose,
  IoPowerOutline,
} from "react-icons/io5";
import {
  MdAnalytics,
  MdMoreVert,
  MdAdminPanelSettings,
} from "react-icons/md";
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
  FiTrash2,
} from "react-icons/fi";
import { supabase } from "../components/supabase";
import VerificationBadge from "../components/VerificationBadge";
import { getActiveModerationExclusions } from "../lib/moderationExclusions";

// VideoPost component
const VideoPost = ({ videoUrl, thumbnailUrl }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
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

export default function Profile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);
      await Promise.all([
        fetchProfile(),
        fetchStats(),
        fetchUserPosts(),
        fetchFollowers(),
        fetchFollowing(),
      ]);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

      const [
        { count: followersCount },
        { count: followingCount },
        { data: postsData },
      ] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
        supabase.from("posts").select("id, post_type, user_id").eq("user_id", user.id),
      ]);

      const visiblePostsCount = (postsData || []).filter((p) => {
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
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setLoadingPosts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:user_id(full_name, username, avatar_url, is_verified)")
        .eq("user_id", user.id)
        .neq("post_type", "community_post")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allPosts = (data || [])
        .filter((p) => {
          const key = `${p.id}_${p.post_type}`;
          return (
            !excludedUserIds.has(String(p.user_id || "")) &&
            !excludedPostKeys.has(key)
          );
        })
        .map((p) => ({ ...p, type: p.post_type }));
      setUserPosts(allPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPostsError("Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { excludedUserIds } = await getActiveModerationExclusions();

      const { data } = await supabase
        .from("follows")
        .select("follower_id, profiles:follower_id(*)")
        .eq("following_id", user.id);

      setFollowers(
        (data || [])
          .filter((d) => !excludedUserIds.has(String(d.follower_id || "")))
          .map((d) => d.profiles)
          .filter(Boolean),
      );
    } catch (error) {
      console.error("Error fetching followers:", error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { excludedUserIds } = await getActiveModerationExclusions();

      const { data } = await supabase
        .from("follows")
        .select("following_id, profiles:following_id(*)")
        .eq("follower_id", user.id);

      const followingList = (data || [])
        .filter((d) => !excludedUserIds.has(String(d.following_id || "")))
        .map((d) => d.profiles)
        .filter(Boolean);
      setFollowing(followingList);
      setFollowingUsers(
        new Set(
          (data || [])
            .map((d) => d.following_id)
            .filter((id) => !excludedUserIds.has(String(id || ""))),
        ),
      );
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleToggleLike = async (postId, postType) => {
    const isLiked = likedPosts.has(postId);
    
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    // Update post like count optimistically
    setUserPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, like_count: (p.like_count || 0) + (isLiked ? -1 : 1) }
        : p
    ));
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await supabase.from("posts").delete().eq("id", post.id);

      setUserPosts(prev => prev.filter(p => p.id !== post.id));
      setStats(prev => ({ ...prev, postsCount: Math.max(prev.postsCount - 1, 0) }));
      setShowDeleteMenu(null);
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  const renderPost = (item) => {
    const userName = item.profiles?.full_name || profile?.full_name || "Your Name";
    const userAvatar = item.profiles?.avatar_url || profile?.avatar_url;
    const postTime = item.created_at 
      ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "8:00 am";
    const likeCount = item.like_count || item.likes || 0;
    const commentCount = item.comment_count || item.comments || 0;

    return (
      <div key={item.id} style={styles.postCard}>
        {/* Post Header */}
        <div style={styles.postHeader}>
          <img
            src={userAvatar || "/avatar.jpg"}
            alt="Avatar"
            style={styles.postAvatar}
            onError={(e) => { e.target.src = "/avatar.jpg"; }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={styles.postUserName}>{userName}</span>
              {(item.profiles?.is_verified || profile?.is_verified) && (
                <VerificationBadge size={16} />
              )}
            </div>
            <span style={styles.postTime}>{postTime}</span>
          </div>
          <button style={styles.menuButton} onClick={() => setShowDeleteMenu(showDeleteMenu === item.id ? null : item.id)}>
            <MdMoreVert size={16} color="#666" />
          </button>
          
          {showDeleteMenu === item.id && (
            <div style={styles.deleteMenu}>
              <button style={styles.deleteMenuItem} onClick={() => handleDeletePost(item)}>
                <FiTrash2 size={18} color="#FF3B30" />
                <span style={{ color: "#FF3B30", marginLeft: "12px" }}>Delete Post</span>
              </button>
            </div>
          )}
        </div>

        {/* Post Title */}
        {item.type !== "verse" && item.title && (
          <h3 style={styles.postTitle}>{item.title}</h3>
        )}

        {/* Post Content */}
        {item.type === "article" && (
          <div style={{ ...styles.articleContent, cursor: "pointer" }} onClick={() => router.push(`/article/${item.id}`, { state: { article: item } })}>
            {item.cover_image_url && (
              <img src={item.cover_image_url} alt="" style={styles.thumbnail} />
            )}
            <p style={styles.postText}>
              {(item.content || item.description || "").slice(0, 150)}...
            </p>
          </div>
        )}

        {item.type === "video" && (
          <div style={styles.fullWidthVideo}>
            <VideoPost videoUrl={item.video_url || item.video} thumbnailUrl={item.thumbnail_url} />
          </div>
        )}

        {item.type === "podcast" && (
          <div>
            <p style={styles.postText}>
              {(item.description || item.content || "").slice(0, 100)}...
            </p>
            {item.cover_image_url && (
              <img src={item.cover_image_url} alt="" style={styles.thumbnail} />
            )}
          </div>
        )}

        {item.type === "verse" && (
          <div style={styles.verseContainer}>
            <p style={styles.verseText}>{item.content}</p>
            {item.image_url && (
              <img src={item.image_url} alt="" style={styles.verseImage} />
            )}
          </div>
        )}

        {/* Post Actions */}
        <div style={styles.iconRow}>
          <button style={styles.iconButton} onClick={() => handleToggleLike(item.id, item.type)}>
            {likedPosts.has(item.id) ? (
              <IoThumbsUp size={18} color="#00bfff" />
            ) : (
              <IoThumbsUpOutline size={18} color="#666" />
            )}
          </button>
          <span style={styles.countText}>{likeCount}</span>

          <MdAnalytics size={18} color="#999" style={{ marginLeft: "16px" }} />
          <span style={styles.countText}>{item.view_count || 0}</span>

          <button style={styles.iconButton}>
            <FiMessageCircle size={18} color="#666" />
          </button>
          <span style={styles.countText}>{commentCount}</span>

          <button style={styles.iconButton}>
            <IoBookmarkOutline size={18} color="#666" />
          </button>

          <button style={styles.iconButton} onClick={() => setShowShareModal(true)}>
            <FiShare2 size={18} color="#666" />
          </button>

          <span style={{ ...styles.countText, marginLeft: "auto" }}>
            {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
          </span>
        </div>

        <div style={styles.postDivider} />
      </div>
    );
  };

  const renderFollower = (item) => (
    <div key={item.id} style={styles.followerCard}>
      <img
        src={item.avatar_url || "/avatar.jpg"}
        alt="Avatar"
        style={styles.followerAvatar}
        onError={(e) => { e.target.src = "/avatar.jpg"; }}
      />
      <div style={{ flex: 1 }}>
        <span style={styles.followerName}>{item.full_name || item.username}</span>
        <p style={styles.followerBio}>{item.bio || "Verrsa Creator"}</p>
      </div>
      {!followingUsers.has(item.id) && currentUser?.id !== item.id && (
        <button style={styles.followBtn}>Follow</button>
      )}
    </div>
  );

  const renderContent = () => {
    if (activeTab === "Posts") {
      if (loadingPosts) {
        return <div style={styles.emptyState}><p>Loading posts...</p></div>;
      }
      if (userPosts.length === 0) {
        return (
          <div style={styles.emptyState}>
            <FiFileText size={48} color="#ccc" />
            <p style={styles.emptyText}>No posts yet</p>
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
        <div style={{ padding: "20px" }}>
          <h3 style={styles.sectionTitle}>About</h3>
          <p style={styles.aboutText}>
            {profile?.bio || "Write something about yourself..."}
          </p>
          
          {profile?.location && (
            <div style={styles.infoRow}>
              <FiMapPin size={16} color="#666" />
              <span style={styles.infoText}>{profile.location}</span>
            </div>
          )}

          {profile?.website && (
            <div style={styles.infoRow}>
              <FiLink size={16} color="#00BFFF" />
              <span style={{ ...styles.infoText, color: "#00BFFF" }}>{profile.website}</span>
            </div>
          )}

          <div style={styles.infoRow}>
            <FiCalendar size={16} color="#666" />
            <span style={styles.infoText}>
              Joined {new Date(profile?.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={styles.container}>
      {/* Fixed Header */}
      <div style={styles.fixedHeader}>
        <button style={styles.backButton} onClick={() => router.back()}>
          <IoChevronBack size={24} color="#111" />
        </button>
        <h1 style={styles.headerTitle}>
          {profile?.username || profile?.email?.split("@")[0] || "Profile"}
        </h1>
        <div style={styles.headerIcons}>
          <button style={styles.iconButton} onClick={() => setShowShareModal(true)}>
            <FiShare2 size={19} color="#666" />
          </button>
          <button style={styles.iconButton} onClick={() => router.push("/profile-settings")}>
            <MdMoreVert size={21} color="#666" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={styles.scrollContent}>
        {/* Profile Section */}
        <div style={styles.profileSection}>
          <img
            src={profile?.avatar_url || "/avatar.jpg"}
            alt="Profile"
            style={styles.avatar}
            onError={(e) => { e.target.src = "/avatar.jpg"; }}
          />
          <div style={styles.profileInfo}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={styles.name}>{profile?.full_name || "Your Name"}</h2>
              {profile?.is_verified && <VerificationBadge size={20} />}
            </div>
            <p style={styles.username}>@{profile?.username || "username"}</p>
            <p style={styles.follow}>
              {stats.postsCount} Posts • {stats.followersCount} Followers • {stats.followingCount} Following
            </p>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && <p style={styles.bioText}>{profile.bio}</p>}

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button style={styles.editBtn} onClick={() => router.push("/profile-settings")}>
            Edit Profile
          </button>
          <button style={styles.iconBtn} onClick={() => router.push("/balance")}>
            <IoWalletOutline size={22} color="#333" />
          </button>
          <button style={styles.iconBtnPrimary} onClick={() => router.push("/messages")}>
            <IoMailOutline size={22} color="#fff" />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          {["Posts", "About", "Followers", "Following"].map((tab) => (
            <button
              key={tab}
              style={styles.tabItem}
              onClick={() => setActiveTab(tab)}
            >
              <span style={activeTab === tab ? styles.activeTabText : styles.tabText}>
                {tab}
              </span>
              {activeTab === tab && <div style={styles.tabIndicator} />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderContent()}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setShowShareModal(false)}>
              <IoClose size={24} color="#333" />
            </button>
            <h2 style={styles.modalTitle}>Share Profile</h2>
            <p style={styles.modalText}>Share your Verrsa profile with others!</p>
            <button style={styles.copyButton} onClick={() => {
              navigator.clipboard.writeText(`https://www.verrsa.org/profile/${profile?.username}`);
              alert("Link copied!");
            }}>
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    padding: "20px 16px",
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
    gap: "12px",
    alignItems: "center",
  },
  scrollContent: {
    padding: "0 16px 24px",
    overflowY: "auto",
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    padding: "16px 0",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "2px solid #00BFFF",
    marginRight: "16px",
    objectFit: "cover",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: "24px",
    fontWeight: "500",
    color: "#111",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  username: {
    fontSize: "16px",
    color: "#666",
    marginTop: "2px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  follow: {
    fontSize: "14px",
    color: "#666",
    marginTop: "8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  bioText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#333",
    marginBottom: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    alignItems: "center",
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  iconBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    border: "none",
    display: "flex",
     padding: "10px",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  iconBtnPrimary: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#00BFFF",
    border: "none",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  tabRow: {
    display: "flex",
    borderBottom: "1px solid #f0f0f0",
    marginBottom: "0",
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
    borderBottom: "1px solid #f0f0f0",
    position: "relative",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    position: "relative",
  },
  postAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    marginRight: "12px",
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
  menuButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    marginLeft: "auto",
  },
  deleteMenu: {
    position: "absolute",
    top: "25px",
    right: "0",
    backgroundColor: "#fff",
    padding: "8px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 10,
    minWidth: "150px",
  },
  deleteMenuItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    fontSize: "15px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postTitle: {
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "12px",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  articleContent: {
    marginBottom: "12px",
  },
  thumbnail: {
    width: "100%",
    height: "200px",
    borderRadius: "8px",
    objectFit: "cover",
    marginBottom: "12px",
  },
  postText: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#333",
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
    height: "400px",
    backgroundColor: "#000",
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: "50%",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderVideo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
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
    marginBottom: "16px",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  verseImage: {
    width: "100%",
    height: "200px",
    borderRadius: "12px",
    objectFit: "cover",
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
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
    fontSize: "14px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postDivider: {
    height: "1px",
    backgroundColor: "#f0f0f0",
    marginTop: "16px",
  },
  followerCard: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #f0f0f0",
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
    marginTop: "2px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  followBtn: {
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginLeft: "auto",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 0",
  },
  emptyText: {
    fontSize: "16px",
    color: "#999",
    marginTop: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "12px",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  aboutText: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#333",
    marginBottom: "16px",
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
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  },
  closeButton: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalText: {
    fontSize: "15px",
    color: "#666",
    marginBottom: "24px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  copyButton: {
    width: "100%",
    backgroundColor: "#00BFFF",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};
