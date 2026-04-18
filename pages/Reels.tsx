// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import {
  IoVideocam,
  IoNotificationsOutline,
  IoSearchOutline,
  IoCloseCircle,
  IoThumbsUpOutline,
  IoThumbsUp,
  IoChatbubbleOutline,
  IoShareOutline,
  IoEllipsisHorizontal,
  IoArrowBack,
} from "react-icons/io5";
import { MdAnalytics } from "react-icons/md";
import { useRouter } from 'next/router';
import CommentModal from '../components/CommentModal';
import SharePostModal from '../components/SharePostModal.web';
import MetaTags from '../components/MetaTags';
import VerificationBadge from '../components/VerificationBadge';
import { getVideos, getVideoById, toggleLike as apiToggleLike, getUserLikeStatusBatch, trackShare } from '../components/api';

// Dummy video data
const dummyVideos = [
  {
    id: "1",
    title: "Amazing Sunset Timelapse",
    description: "Watch this beautiful sunset captured over 2 hours",
    thumbnail_url: "https://picsum.photos/seed/video1/400/600",
    video_url: "https://picsum.photos/seed/video1/400/600",
    view_count: 12500,
    like_count: 892,
    comment_count: 45,
    created_at: "2024-03-24T10:30:00Z",
    user: {
      id: "u1",
      full_name: "Sarah Johnson",
      username: "@sarahjohnson",
      avatar_url: "https://i.pravatar.cc/150?img=1",
      is_verified: true,
    },
  },
  {
    id: "2",
    title: "Quick Recipe Tutorial",
    description: "Learn to make the perfect pasta in under 60 seconds!",
    thumbnail_url: "https://picsum.photos/seed/video2/400/600",
    video_url: "https://picsum.photos/seed/video2/400/600",
    view_count: 8300,
    like_count: 654,
    comment_count: 32,
    created_at: "2024-03-23T14:20:00Z",
    user: {
      id: "u2",
      full_name: "Chef Marco",
      username: "@chefmarco",
      avatar_url: "https://i.pravatar.cc/150?img=12",
      is_verified: true,
    },
  },
  {
    id: "3",
    title: "Street Performance Magic",
    description: "Mind-blowing street magic performance in downtown",
    thumbnail_url: "https://picsum.photos/seed/video3/400/600",
    video_url: "https://picsum.photos/seed/video3/400/600",
    view_count: 25600,
    like_count: 1823,
    comment_count: 98,
    created_at: "2024-03-22T09:15:00Z",
    user: {
      id: "u3",
      full_name: "Alex Rivera",
      username: "@alexmagic",
      avatar_url: "https://i.pravatar.cc/150?img=33",
      is_verified: false,
    },
  },
  {
    id: "4",
    title: "Workout Routine",
    description: "5 minute morning workout to start your day right",
    thumbnail_url: "https://picsum.photos/seed/video4/400/600",
    video_url: "https://picsum.photos/seed/video4/400/600",
    view_count: 15400,
    like_count: 1120,
    comment_count: 67,
    created_at: "2024-03-21T07:45:00Z",
    user: {
      id: "u4",
      full_name: "Fitness Emma",
      username: "@fitnessemma",
      avatar_url: "https://i.pravatar.cc/150?img=5",
      is_verified: true,
    },
  },
  {
    id: "5",
    title: "Travel Vlog: Tokyo",
    description: "Exploring the hidden gems of Tokyo - Day 1",
    thumbnail_url: "https://picsum.photos/seed/video5/400/600",
    video_url: "https://picsum.photos/seed/video5/400/600",
    view_count: 34200,
    like_count: 2456,
    comment_count: 156,
    created_at: "2024-03-20T16:30:00Z",
    user: {
      id: "u5",
      full_name: "Travel Mike",
      username: "@travelmike",
      avatar_url: "https://i.pravatar.cc/150?img=15",
      is_verified: true,
    },
  },
];

const categories = [
  "For You",
  "Following",
  "Trending",
  "Sports",
  "Music",
  "Comedy",
  "Education",
];

function Reels() {
  const router = useRouter();
  const { id } = router.query;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("For You");
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [videos, setVideos] = useState([]);
  const [showMenu, setShowMenu] = useState(null);
  const [unreadNotifications] = useState(3);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => { 
    if (id) {
      // Single video view - load the specific video plus more for swiping
      fetchSingleVideo();
    } else {
      // Feed view
      fetchData(); 
    }
  }, [id]);

  // Handle scroll snap for single video view
  useEffect(() => {
    if (!id || !containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const windowHeight = window.innerHeight;
      const index = Math.round(scrollPosition / windowHeight);
      
      if (index !== currentIndex && index >= 0 && index < videos.length) {
        setCurrentIndex(index);
        
        // Update URL without navigation
        if (videos[index]) {
          window.history.replaceState(null, '', `/reel/${videos[index].id}`);
        }
      }

      // Load more videos when near the end
      if (index >= videos.length - 2 && !loading) {
        loadMoreVideos();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [id, currentIndex, videos, loading]);

  const fetchSingleVideo = async () => {
    try {
      setLoading(true);
      let mainVideo = null;
      
      // Try to get from location state first
      if ((router.query as any)?.video) {
        mainVideo = (router.query as any).video;
      } else {
        // Fetch from API
        mainVideo = await getVideoById(id);
      }
      
      setCurrentVideo(mainVideo);
      
      // Load more videos for swiping
      const moreVideos = await getVideos(20);
      
      // Combine: put the current video first, then filter it out from others
      const allVideos = [mainVideo, ...moreVideos.filter(v => v.id !== mainVideo.id)];
      setVideos(allVideos);
      
      // Check like status
      const items = allVideos.map((v) => ({ id: v.id, type: 'video' }));
      const likeStatuses = await getUserLikeStatusBatch(items);
      setLikedVideos(new Set(Object.entries(likeStatuses).filter(([, v]) => v).map(([k]) => k.split('_')[0])));
    } catch (err) {
      console.error('Error fetching video:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreVideos = async () => {
    try {
      const moreVideos = await getVideos(10, videos.length);
      if (moreVideos.length > 0) {
        setVideos(prev => [...prev, ...moreVideos]);
        
        // Check like status for new videos
        const items = moreVideos.map((v) => ({ id: v.id, type: 'video' }));
        const likeStatuses = await getUserLikeStatusBatch(items);
        setLikedVideos(prev => {
          const updated = new Set(prev);
          Object.entries(likeStatuses).filter(([, v]) => v).forEach(([k]) => updated.add(k.split('_')[0]));
          return updated;
        });
      }
    } catch (err) {
      console.error('Error loading more videos:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getVideos(30);
      setVideos(data);
      if (data.length > 0) {
        const items = data.map((v) => ({ id: v.id, type: 'video' }));
        const likeStatuses = await getUserLikeStatusBatch(items);
        setLikedVideos(new Set(Object.entries(likeStatuses).filter(([, v]) => v).map(([k]) => k.split('_')[0])));
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (videoId) => {
    const nowLiked = !likedVideos.has(videoId);
    setLikedVideos((prev) => { const s = new Set(prev); nowLiked ? s.add(videoId) : s.delete(videoId); return s; });
    setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, like_count: (v.like_count || 0) + (nowLiked ? 1 : -1) } : v));
    await apiToggleLike(videoId, 'video').catch(console.error);
  };

  const handleShare = async (video) => {
    setSelectedVideo(video);
    setShareModalVisible(true);
  };

  const handleComment = (video) => {
    setSelectedVideo(video);
    setCommentModalVisible(true);
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <MetaTags
        title={currentVideo?.title || "Reels - Verrsa"}
        description={currentVideo?.description || "Watch short videos and reels from creators on Verrsa. Discover entertaining and educational video content."}
        image={currentVideo?.id ? `https://www.verrsa.org/api/post?id=${encodeURIComponent(currentVideo.id)}` : currentVideo?.thumbnail_url}
        url={typeof window !== "undefined" ? window.location.href : ""}
        type="video.other"
        video={currentVideo?.video_url}
      />
      <div 
      ref={containerRef}
      style={{
        ...styles.container,
        ...styles.fullscreenContainer,
      }}
    >
      {/* Fixed Header - only show in single video mode */}
      {id && (
        <div style={styles.fixedHeader}>
          <button style={styles.backButton} onClick={() => router.back()}>
            <IoArrowBack size={24} color="#fff" />
          </button>
          <h2 style={styles.headerTitle}>Video</h2>
          <div style={{ width: 24 }} />
        </div>
      )}

      {/* Videos Grid */}
      <div style={{
        ...styles.content,
        ...styles.fullscreenContent,
        paddingTop: "0",
      }}>
        {videos.map((video, index) => (
          <div 
            key={video.id} 
            style={{
              ...styles.videoCard,
              ...styles.fullscreenVideoCard,
            }}
          >
            {/* Video Header */}
            <div style={styles.videoHeader}>
              <div style={styles.userInfo}>
                <img
                  src={video.profiles?.avatar_url || video.user?.avatar_url || '/avatar.jpg'}
                  alt={video.profiles?.full_name || video.user?.full_name || 'User'}
                  style={styles.avatar}
                />
                <div>
                  <div style={styles.usernameRow}>
                    <span style={styles.username}>{video.profiles?.full_name || video.user?.full_name || 'Unknown'}</span>
                    {(video.profiles?.is_verified || video.user?.is_verified) && (
                      <VerificationBadge size={16} />
                    )}
                  </div>
                  <span style={styles.time}>{getTimeAgo(video.created_at)}</span>
                </div>
              </div>
              <button
                style={styles.menuButton}
                onClick={() =>
                  setShowMenu(showMenu === video.id ? null : video.id)
                }
              >
                <IoEllipsisHorizontal size={20} color="#555" />
              </button>
              {showMenu === video.id && (
                <div style={styles.menuDropdown}>
                  <button style={styles.menuItem}>Report</button>
                  <button style={styles.menuItem}>Block User</button>
                </div>
              )}
            </div>

            {/* Video Title */}
            <h3 style={styles.videoTitle}>{video.title}</h3>

            {/* Video Player */}
            <div style={{
              ...styles.thumbnailContainer,
              ...styles.fullscreenThumbnailContainer,
            }}>
              {video.video_url ? (
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  style={styles.thumbnail}
                  controls
                  playsInline
                  preload="metadata"
                  autoPlay={id && index === currentIndex}
                  muted={id}
                  loop={id}
                />
              ) : video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  style={styles.thumbnail}
                />
              ) : (
                <div style={{ ...styles.thumbnail, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a1a" }}>
                  <IoVideocam size={48} color="#444" />
                </div>
              )}
            </div>

            {/* Video Description */}
            <p style={styles.description}>{video.description}</p>

            {/* Engagement Row */}
            <div style={styles.engagementRow}>
              <button
                style={styles.engagementButton}
                onClick={() => toggleLike(video.id)}
              >
                {likedVideos.has(video.id) ? (
                  <IoThumbsUp size={18} color="#00BFFF" />
                ) : (
                  <IoThumbsUpOutline size={18} color="#555" />
                )}
                <span
                  style={{
                    ...styles.engagementText,
                    color: likedVideos.has(video.id) ? "#00BFFF" : "#555",
                  }}
                >
                  {formatCount(video.like_count || 0)}
                </span>
              </button>

              <button style={styles.engagementButton}>
                <MdAnalytics size={18} color="#555" />
                <span style={styles.engagementText}>
                  {formatCount(video.view_count)}
                </span>
              </button>

              <button style={styles.engagementButton}
                onClick={() => handleComment(video)}>
                <IoChatbubbleOutline size={18} color="#555" />
                <span style={styles.engagementText}>
                  {formatCount(video.comment_count)}
                </span>
              </button>

              <button style={styles.engagementButton} onClick={() => handleShare(video)}>
                <IoShareOutline size={18} color="#555" />
              </button>
            </div>

            {/* Separator */}
            <div style={styles.separator} />
          </div>
        )))
        ) : (
          <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>No videos found</p>
          </div>
        )}
      </div>

      {/* Floating Action Button 
      <button style={styles.fab}>
        <span style={styles.fabText}>+</span>
      </button> */}

      {/* Comment Modal */}
      {selectedVideo && (
        <CommentModal
          visible={commentModalVisible}
          onClose={() => {
            setCommentModalVisible(false);
            setSelectedVideo(null);
          }}
          contentId={selectedVideo.id}
          contentType="video"
          onCommentAdded={() => {
            setVideos(videos.map(v => 
              v.id === selectedVideo.id 
                ? { ...v, comment_count: (v.comment_count || 0) + 1 }
                : v
            ));
          }}
        />
      )}

      {/* Share Modal */}
      {selectedVideo && (
        <SharePostModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setSelectedVideo(null);
          }}
          postId={selectedVideo.id}
          postType="video"
          title={selectedVideo.title}
          description={selectedVideo.description}
          imageUrl={selectedVideo.thumbnail_url}
          postUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/reel/${selectedVideo.id}`}
        />
      )}
    </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#000",
    fontFamily: "'Instrument Sans', sans-serif",
    paddingBottom: "120px",
  },
  fullscreenContainer: {
    height: "100vh",
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 0,
  },
  fixedHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    zIndex: 1000,
    paddingTop: "48px",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#fff",
    margin: 0,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
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
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    marginTop: "24px",
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
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  category: {
    border: "1px solid #ccc",
    borderRadius: "12px",
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#ccc",
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
  content: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  fullscreenContent: {
    padding: 0,
    maxWidth: "100%",
    margin: 0,
  },
  videoCard: {
    marginBottom: "32px",
    position: "relative",
  },
  fullscreenVideoCard: {
    minHeight: "100vh",
    height: "100vh",
    marginBottom: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "20px 20px 20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  videoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    position: "relative",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  usernameRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  username: {
    fontWeight: "500",
    fontSize: "15px",
    color: "#fff",
  },
  time: {
    fontSize: "13px",
    color: "#888",
  },
  menuButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  menuDropdown: {
    position: "absolute",
    top: "40px",
    right: "0",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    padding: "8px 0",
    minWidth: "150px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    zIndex: 1001,
    border: "1px solid #333",
  },
  menuItem: {
    width: "100%",
    padding: "12px 16px",
    background: "none",
    border: "none",
    textAlign: "left",
    color: "#FF3B30",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
    transition: "background-color 0.2s ease",
  },
  videoTitle: {
    fontSize: "17px",
    fontWeight: "400",
    color: "#fff",
    marginBottom: "12px",
    lineHeight: "1.4",
  },
  thumbnailContainer: {
    position: "relative",
    width: "100%",
    paddingTop: "150%",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    marginBottom: "12px",
  },
  fullscreenThumbnailContainer: {
    paddingTop: 0,
    height: "700px",
    maxWidth: "600px",
    margin: "0 auto 20px",
    borderRadius: "16px",
  },
  thumbnail: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: "50%",
    width: "80px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  description: {
    fontSize: "15px",
    color: "#ccc",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  engagementRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
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
    backgroundColor: "#00BFFF",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 191, 255, 0.3)",
    zIndex: 999,
    transition: "all 0.2s ease",
  },
  fabText: {
    fontSize: "32px",
    color: "#fff",
    fontWeight: "300",
    lineHeight: "1",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 20px",
    backgroundColor: "#000",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #333",
    borderTop: "4px solid #00BFFF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "16px",
    color: "#888",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};

export default Reels;
