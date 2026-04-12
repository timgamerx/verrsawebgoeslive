// @ts-nocheck

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { supabase } from '../components/supabase';
import { getActiveModerationExclusions } from '../lib/moderationExclusions';
import {
  IoPeople,
  IoNotificationsOutline,
  IoSearchOutline,
  IoCloseCircle,
  IoThumbsUpOutline,
  IoThumbsUp,
  IoShareOutline,
  IoAddOutline,
} from "react-icons/io5";
import { MdAnalytics } from "react-icons/md";



const categories = [
  "For You",
  "Latest",
  "Following",
  "Tech",
  "Fitness",
  "Creative",
  "Education",
  "Travel",
];

function Community() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("For You");
  const [likedCommunities, setLikedCommunities] = useState(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState(new Set());
  const [communities, setCommunities] = useState([]);
  const [unreadNotifications] = useState(5);
  const [userAvatar, setUserAvatar] = useState('/avatar.jpg');

  useEffect(() => {
    const fetchUserAvatar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single();
      if (data?.avatar_url) setUserAvatar(data.avatar_url);
    };

    const fetchCommunities = async () => {
      const { excludedUserIds } = await getActiveModerationExclusions();
      const { data: community, error } = await supabase
        .from('community')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && community) {
        const filtered = community.filter((c) => {
          const ownerId = String(c.created_by || c.user_id || "");
          return !excludedUserIds.has(ownerId);
        });
        setCommunities(filtered);
      }
    };

    fetchUserAvatar();
    fetchCommunities();
  }, []);

  const toggleLike = (communityId) => {
    setLikedCommunities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(communityId)) {
        newSet.delete(communityId);
      } else {
        newSet.add(communityId);
      }
      return newSet;
    });
  };

  const toggleJoin = (communityId, isPrivate) => {
    if (isPrivate) return;
    setJoinedCommunities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(communityId)) {
        newSet.delete(communityId);
      } else {
        newSet.add(communityId);
      }
      return newSet;
    });
  };

  const formatCount = (count) => {
    const n = count ?? 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredCommunities = communities.filter((community) => {
    const matchesSearch =
      searchTerm === "" ||
      community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={styles.container}>
      {/* Top Header (title only) */}
      <div style={styles.fixedHeader}>
        <h1 style={styles.headerTitle}>Community</h1>
      </div>

      {/* Scrollable Content */}
      <div style={styles.scrollContent}>
        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <IoSearchOutline size={17} color="#888" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search community"
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.length > 0 && (
            <button
              style={styles.clearButton}
              onClick={() => setSearchTerm("")}
            >
              <IoCloseCircle size={20} color="#888" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div style={styles.categoryContainer}>
          {categories.map((category) => (
            <button
              key={category}
              style={
                selectedCategory === category
                  ? styles.categoryActive
                  : styles.category
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Community Circles Row */}
        <div style={styles.avatarRow}>
          {/* Create Community Button 
          <div style={styles.communityCircle}>
            <div style={styles.createWrapper}>
              <img
                src={userAvatar}
                alt="Create"
                style={styles.circleAvatar}
              />
              <div style={styles.overlay}>
                <IoAddOutline size={26} color="#fff" />
              </div>
            </div>
            <span style={styles.circleText}>Create</span>
          </div> */}

          {communities.slice(0, 4).map((community) => (
            <div 
              key={community.id} 
              style={{ ...styles.communityCircle, cursor: 'pointer' }}
              onClick={() => router.push(`/community/${community.id}`)}
            >
              <img
                src={community.avatar_url}
                alt={community.name}
                style={styles.circleAvatar}
              />
              <span style={styles.circleText}>
                {community.name.length > 8
                  ? community.name.substring(0, 8) + "..."
                  : community.name}
              </span>
            </div> 
          ))}
        </div>

        {/* Communities List */}
        <div style={styles.content}>
        {filteredCommunities.length === 0 ? (
          <p style={styles.emptyText}>No communities found.</p>
        ) : (
          filteredCommunities.map((community) => (
            <div key={community.id} style={styles.communityCard}>
              {/* Community Header */}
              <div style={styles.communityHeader}>
                <div 
                  style={{ ...styles.userInfo, cursor: 'pointer' }}
                  onClick={() => router.push(`/community/${community.id}`)}
                >
                  <img
                    src={community.avatar_url}
                    alt={community.name}
                    style={styles.avatar}
                  />
                  <div>
                    <h3 style={styles.communityName}>{community.name}</h3>
                    <p style={styles.description}>
                      {community.description.slice(0, 50)}
                      {community.description.length > 50 ? "..." : ""}
                    </p>
                  </div>
                </div>
                <button
                  style={
                    joinedCommunities.has(community.id) || community.is_private
                      ? styles.joinedButton
                      : styles.joinButton
                  }
                  onClick={() =>
                    toggleJoin(community.id, community.is_private)
                  }
                  disabled={community.is_private}
                >
                  {community.is_private
                    ? "Private"
                    : joinedCommunities.has(community.id)
                      ? "Leave"
                      : "Join"}
                </button>
              </div>

              {/* Cover Image */}
              {community.cover_image_url && (
                <img
                  src={community.cover_image_url}
                  alt={community.name}
                  style={styles.coverImage}
                />
              )}

              {/* Engagement Row */}
              <div style={styles.engagementRow}>
                <button
                  style={styles.engagementButton}
                  onClick={() => toggleLike(community.id)}
                >
                  {likedCommunities.has(community.id) ? (
                    <IoThumbsUp size={18} color="#00BFFF" />
                  ) : (
                    <IoThumbsUpOutline size={18} color="#999" />
                  )}
                  <span
                    style={{
                      ...styles.engagementText,
                      color: likedCommunities.has(community.id)
                        ? "#00BFFF"
                        : "#999",
                    }}
                  >
                    {formatCount(
                      community.like_count +
                        (likedCommunities.has(community.id) ? 1 : 0)
                    )}
                  </span>
                </button>

                <button style={styles.engagementButton}>
                  <MdAnalytics size={18} color="#999" />
                  <span style={styles.engagementText}>
                    {formatCount(community.view_count)}
                  </span>
                </button>

                <button style={styles.engagementButton}>
                  <IoPeople size={18} color="#999" />
                  <span style={styles.engagementText}>
                    {formatCount(community.member_count)}
                  </span>
                </button>

                <button style={styles.engagementButton}>
                  <IoShareOutline size={18} color="#999" />
                </button>

                <span style={styles.dateText}>
                  {new Date(community.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                  })}
                </span>
              </div>

              {/* Separator */}
              <div style={styles.separator} />
            </div>
          ))
        )}
      </div>
      </div>

      {/* Floating Action Button */}
      <button style={styles.fab}
        onClick={() => window.location.href = "/create-community"}
      >
        <span style={styles.fabText}>+</span>
      </button>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#000",
    fontFamily: "'Instrument Sans', sans-serif",
    paddingBottom: "120px",
  },
  fixedHeader: {
    position: "sticky",
    top: 0,
    backgroundColor: "#000",
    zIndex: 20,
    paddingTop: "24px",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  scrollContent: {
    overflowY: "auto",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "120px",
    paddingTop: "12px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "46px",
  },
  logo: {
    width: "90px",
    height: "24px",
    objectFit: "contain",
  },
  topIcons: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    backgroundColor: "#FF3B30",
    borderRadius: "10px",
    minWidth: "18px",
    height: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "10px",
    fontWeight: "bold",
    color: "#fff",
    padding: "0 4px",
  },
  avatarSmall: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    marginBottom: "0px",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    marginTop: "0px",
  },
  searchIcon: {
    marginRight: "8px",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: "15px",
    color: "#fff",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  clearButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryContainer: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "8px",
    marginBottom: "20px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  category: {
    border: "1px solid #444",
    borderRadius: "12px",
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#999",
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  categoryActive: {
    backgroundColor: "#00BFFF",
    border: "1px solid #00BFFF",
    borderRadius: "12px",
    padding: "8px 16px",
    color: "#fff",
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: "500",
  },
  avatarRow: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    paddingBottom: "20px",
    marginTop: "12px",
    marginBottom: "8px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  communityCircle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "60px",
    cursor: "pointer",
  },
  circleAvatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "6px",
  },
  circleText: {
    fontSize: "12px",
    color: "#fff",
    textAlign: "center",
    maxWidth: "60px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  createWrapper: {
    position: "relative",
    width: "50px",
    height: "50px",
    marginBottom: "6px",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "rgba(0, 191, 255, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  content: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  emptyText: {
    color: "#999",
    textAlign: "center",
    fontSize: "16px",
    marginTop: "40px",
  },
  communityCard: {
    marginBottom: "32px",
  },
  communityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  userInfo: {
    display: "flex",
    gap: "12px",
    flex: 1,
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  communityName: {
    fontSize: "17px",
    fontWeight: "500",
    color: "#fff",
    marginBottom: "4px",
  },
  description: {
    fontSize: "14px",
    color: "#999",
    lineHeight: "1.4",
  },
  joinButton: {
    backgroundColor: "#00BFFF",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },
  joinedButton: {
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "8px 16px",
    color: "#999",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
    flexShrink: 0,
  },
  coverImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  engagementRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "16px",
  },
  engagementButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
  },
  engagementText: {
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
    color: "#999",
  },
  dateText: {
    fontSize: "14px",
    color: "#666",
    marginLeft: "auto",
  },
  separator: {
    height: "1px",
    backgroundColor: "#2a2a2a",
    marginTop: "24px",
  },
  fab: {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#00bfff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(156, 39, 176, 0.3)",
    zIndex: 999,
    transition: "all 0.2s ease",
  },
  fabText: {
    fontSize: "32px",
    color: "#fff",
    fontWeight: "300",
    lineHeight: "1",
  },
};

export default Community;
