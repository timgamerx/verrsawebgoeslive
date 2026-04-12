// @ts-nocheck

import React, { useState, useRef, useEffect } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { 
  IoThumbsUpOutline, 
  IoThumbsUp, 
  IoShareSocialOutline,
  IoBookmarkOutline,
  IoSearchOutline,
  IoPlayCircle,
  IoVolumeMuteOutline,
  IoChatbubbleOutline,
  IoMicOutline,
  IoVideocamOutline,
  IoPencilOutline,
  IoEyeOutline
} from "react-icons/io5";
import { MdAnalytics, MdArrowForwardIos } from "react-icons/md";
import { HiDotsHorizontal } from "react-icons/hi";
import { useRouter } from 'next/router';
import CommentModal from '../components/CommentModal';
import SharePostModal from '../components/SharePostModal.web';
import MetaTags from '../components/MetaTags';
import { getAllPosts, toggleLike as apiToggleLike, getUserLikeStatusBatch, toggleBookmark as apiToggleBookmark, getUserBookmarkStatusBatch, trackShare } from '../components/api';


// Dummy posts data
const DUMMY_POSTS = [
  {
    id: "article-1",
    type: "article",
    title: "The Future of Artificial Intelligence in Healthcare",
    content: "Artificial intelligence is revolutionizing healthcare by enabling faster diagnoses, personalized treatment plans, and predictive analytics. From detecting diseases in medical imaging to drug discovery, AI is transforming how we approach medicine...",
    user: "Dr. Sarah Johnson",
    user_id: "user-1",
    profiles: {
      full_name: "Dr. Sarah Johnson",
      avatar_url: "/avatar.jpg",
      is_verified: true,
    },
    created_at: new Date().toISOString(),
    time: "2:30 pm",
    like_count: 124,
    comment_count: 18,
    view_count: 1250,
    cover_image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
  },
  {
    id: "verse-1",
    type: "verse",
    content: "Just finished an amazing coding session! There's nothing quite like the feeling when your code finally works after hours of debugging. The journey is tough, but so rewarding. 💻✨ #CodingLife #DeveloperJourney",
    user: "Alex Chen",
    user_id: "user-2",
    profiles: {
      full_name: "Alex Chen",
      avatar_url: "/avatar.jpg",
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    time: "1:15 pm",
    like_count: 89,
    comment_count: 12,
    view_count: 450,
  },
  {
    id: "podcast-1",
    type: "podcast",
    title: "Building Resilience in Uncertain Times",
    description: "Join us as we explore practical strategies for building mental resilience and maintaining productivity during challenging periods. Our guest shares personal experiences and actionable advice for staying focused on your goals.",
    user: "Michael Roberts",
    user_id: "user-3",
    profiles: {
      full_name: "Michael Roberts",
      avatar_url: "/avatar.jpg",
    },
    created_at: new Date(Date.now() - 7200000).toISOString(),
    time: "12:00 pm",
    like_count: 256,
    comment_count: 34,
    view_count: 2100,
    cover_image_url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800",
    duration: 2850,
  },
  {
    id: "video-1",
    type: "video",
    title: "Quick Morning Routine for Productivity",
    description: "Start your day right with this simple 10-minute routine that will boost your energy and focus! 🌅",
    user: "Emma Wilson",
    user_id: "user-4",
    profiles: {
      full_name: "Emma Wilson",
      avatar_url: "/avatar.jpg",
      is_verified: true,
    },
    created_at: new Date(Date.now() - 10800000).toISOString(),
    time: "10:30 am",
    like_count: 512,
    comment_count: 67,
    view_count: 5400,
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
  },
  {
    id: "verse-2",
    type: "verse",
    content: "Beautiful sunset from today's hike! Nature never fails to amaze me. 🌄",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    user: "Jessica Martinez",
    user_id: "user-5",
    profiles: {
      full_name: "Jessica Martinez",
      avatar_url: "/avatar.jpg",
    },
    created_at: new Date(Date.now() - 14400000).toISOString(),
    time: "9:00 am",
    like_count: 234,
    comment_count: 28,
    view_count: 1800,
  },
];

const CATEGORIES = ["All", "Technology", "Health", "Business", "Lifestyle", "Education"];

function Home() {
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const router = useRouter();

  const navigateToWriteArticle = () => {
    router.push('/write-article');
  };

  const navigateToCreatePodcast = () => {
    router.push('/create-podcast');
  };

  const navigateToPostVideo = () => {
    router.push('/post-video');
  };

  const navigateToCreateVerse = () => {
    router.push('/create-verse');
  };

  const navigateToUserProfile = (userId) => {
    if (userId) router.push(`/user/${userId}`);
  };

  const [loading, setLoading] = useState(true);
  const hasLoadedPosts = useRef(false);

  // Fetch all posts from Supabase on mount, but only once
  useEffect(() => {
    if (!hasLoadedPosts.current) {
      fetchAllPosts();
      hasLoadedPosts.current = true;
    }
  }, []);

  const fetchAllPosts = async () => {
    try {
      setLoading(true);

      const rawPosts = await getAllPosts(80);

      const allPosts = (rawPosts || []).map((item) => ({
        ...item,
        time: new Date(item.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
      }));

      setPosts(allPosts);

      if (allPosts.length > 0) {
        const items = allPosts.map((p) => ({ id: p.id, type: p.type }));
        const [likeStatuses, bookmarkStatuses] = await Promise.all([
          getUserLikeStatusBatch(items),
          getUserBookmarkStatusBatch(items),
        ]);
        const liked = new Set(
          Object.entries(likeStatuses).filter(([, v]) => v).map(([k]) => k.split('_')[0])
        );
        const bookmarked = new Set(
          Object.entries(bookmarkStatuses).filter(([, v]) => v).map(([k]) => k)
        );
        setLikedPosts(liked);
        setBookmarkedPosts(bookmarked);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (postId, postType) => {
    const nowLiked = !likedPosts.has(postId);
    setLikedPosts((prev) => { const s = new Set(prev); nowLiked ? s.add(postId) : s.delete(postId); return s; });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: (p.like_count || 0) + (nowLiked ? 1 : -1) } : p));
    await apiToggleLike(postId, postType || 'article').catch(console.error);
  };

  const handleToggleBookmark = async (postId, postType) => {
    const nowBookmarked = !bookmarkedPosts.has(postId);
    setBookmarkedPosts((prev) => { const s = new Set(prev); nowBookmarked ? s.add(postId) : s.delete(postId); return s; });
    await apiToggleBookmark(postId, postType || 'article').catch(console.error);
  };

  const handleShare = async (post) => {
    setSelectedPost(post);
    setShareModalVisible(true);
  };

  const handleComment = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const renderPost = (item) => {
    const userName = item.profiles?.full_name || item.user;
    const userAvatar = item.profiles?.avatar_url || "/avatar.jpg";
    const postTime = item.time;
    const postImage = item.cover_image_url || item.image;
    const videoUrl = item.video_url || item.video;
    const videoThumbnail = item.thumbnail_url;
    const postContent = item.content || item.description || "";

    const getTruncatedContent = (text, maxWords) => {
      const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
      if (words.length === 0) return "";
      if (words.length <= maxWords) return text;
      return words.slice(0, maxWords).join(" ") + "...";
    };


    const getDisplayContent = () => {
      if (item.type === "article") {
        return getTruncatedContent(postContent, 25);
      } else if (item.type === "podcast") {
        return getTruncatedContent(postContent, 20);
      }
      return postContent;
    };

    const displayContent = getDisplayContent();

    return (
      <div key={item.id} style={styles.postContainer}>
        {/* Post Header */}
        <div style={styles.postHeader}>
          <img src={userAvatar} alt="Avatar" style={{ ...styles.avatar, cursor: "pointer" }}
          onClick={() => navigateToUserProfile(item.user_id)}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.username}>{userName}</span>
              {item.profiles?.is_verified && (
                <span style={{ color: "#00BFFF", fontSize: "14px" }}>✓</span>
              )}
            </div>
            <span style={styles.time}>{postTime}</span>
          </div>
          <div style={{ position: "relative" }}>
            <HiDotsHorizontal
              size={16}
              color="#888"
              style={{ cursor: "pointer" }}
              onClick={() => setShowReportMenu(showReportMenu === item.id ? null : item.id)}
            />
          </div>
        </div>

        {/* Post Title (for article/podcast) */}
        {item.type !== "verse" && (
          <h3 style={styles.postTitle}>{item.title}</h3>
        )}

        {/* Article Content */}
        {item.type === "article" && (
          <div style={{ cursor: "pointer" }} onClick={() => router.push(`/article/${item.id}`, { state: { article: item } })}>
            <div style={styles.rowContent}>
              <p style={styles.postText}>{displayContent}</p>
              {postImage && (
                <img src={postImage} alt="Post" style={styles.thumbnail} />
              )}
              
            </div>
          </div>
        )}

        {/* Video Content */}
        {item.type === "video" && (
          <div style={styles.fullWidthVideoWrapper}>
            <div style={{ cursor: "pointer", position: "relative" }}>
              <div style={styles.videoWrapper}
               onClick ={() => router.push(`/reel/${item.id}`, { state: { video: item } })}
              >
                {videoThumbnail && (
                  <img src={videoThumbnail} alt="Video" style={styles.videoPlayer} 
                 
                  />
                )}
                <div style={styles.videoOverlay}>
                  <IoPlayCircle size={50} color="rgba(255, 255, 255, 0.9)" />
                </div>
                <div style={styles.muteIndicator}>
                  <IoVolumeMuteOutline size={16} color="rgba(255, 255, 255, 0.8)" />
                </div>
              </div>
              {displayContent && (
                <div style={styles.videoDescription}>
                  <p style={styles.videoDescriptionText}>{displayContent}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Podcast Content */}
        {item.type === "podcast" && (
          <div>
            <p style={{ ...styles.postText, marginTop: "12px", marginLeft: 0, marginBottom: "12px" }}>
              {displayContent}
            </p>
            <div style={{ cursor: "pointer" }}>
              {postImage && (
                <img src={postImage} alt="Podcast" style={styles.thumbnail} 
                onClick ={() => router.push(`/podcast/${item.id}`, { state: { podcast: item } })}
                />
              )}
            </div>
          </div>
        )}

        {/* Verse Content */}
        {item.type === "verse" && (
          <div style={styles.verseContainer}>
            <p style={styles.verseText}>{item.content}</p>
            {item.image_url && (
              <img src={item.image_url} alt="Verse" style={styles.verseImage} />
            )}
          </div>
        )}

        {/* Icon Row */}
        <div style={styles.iconRow}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => handleToggleLike(item.id, item.type)}
          >
            {likedPosts.has(item.id) ? (
              <IoThumbsUp size={18} color="#00BFFF" />
            ) : (
              <IoThumbsUpOutline size={18} color="#888" />
            )}
            <span style={styles.iconText}>{item.like_count || 0}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MdAnalytics size={18} color="#888" />
            <span style={styles.iconText}>{item.view_count || 0}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => handleComment(item)}>
            <IoChatbubbleOutline size={18} color="#888" />
            <span style={styles.iconText}>{item.comment_count || 0}</span>
          </div>

          <div style={{ cursor: "pointer" }} onClick={() => handleToggleBookmark(item.id, item.type)}>
            <IoBookmarkOutline size={18} color={bookmarkedPosts.has(item.id) ? "#00BFFF" : "#888"} />
          </div>

          <div style={{ cursor: "pointer" }} onClick={() => handleShare(item)}>
            <IoShareSocialOutline size={18} color="#888" />
          </div>

          <span style={styles.dateText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                })
              : "08 July"}
          </span>

          {/* Action Button */}
          {item.type === "article" && (
            <div style={styles.readMoreCircle} onClick={() => router.push(`/article/${item.id}`, { state: { article: item } })}>
              <MdArrowForwardIos size={14} color="#00BFFF" />
            </div>
          )}
          {item.type === "video" && (
            <div style={{ ...styles.readMoreCircle, borderColor: "#FF6347" }}
              onClick={() => router.push(`/reel/${item.id}`, { state: { video: item } })}>
              <IoPlayCircle size={14} color="#FF6347" />
            </div>
          )}
          {item.type === "podcast" && (
            <div style={{ ...styles.readMoreCircle, borderColor: "#32CD32" }}>
              <IoMicOutline size={14} color="#32CD32" />
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={styles.separator} />
      </div>
    );
  };

  return (
    <>
      <MetaTags
        title="Verrsa - Write, Post, Live, Earn"
        description="Join Verrsa to discover amazing content from creators. Read articles, watch videos, listen to podcasts, and share your own verses with the world."
        url={typeof window !== "undefined" ? window.location.href : ""}
        type="website"
      />
      <div style={styles.container}>
      <div style={styles.stickyHeader}>
        <div style={styles.headerRow}>
          <img src="/verrsa-logo.png" alt="Verrsa" style={styles.headerLogo} />
          <button type="button" style={styles.headerIconButton} aria-label="Notifications">
            <IoMdNotificationsOutline size={22} color="#111" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.scrollContent}>
        {/* Search Section */}
        <div style={styles.searchContainer}>
         <IoSearchOutline size={17} color="#888" style={{ marginRight: "8px" }} />
          <input
            type="text"
            placeholder="Search posts, creators..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Section */}
        <div style={styles.categoryContainer}>
          {CATEGORIES.map((category) => (
            <div
              key={category}
              style={
                selectedCategory === category
                  ? styles.categoryActive
                  : styles.category
              }
              onClick={() => setSelectedCategory(category)}
            >
              <span
                style={
                  selectedCategory === category
                    ? styles.categoryTextActive
                    : styles.categoryText
                }
              >
                {category}
              </span>
            </div>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading posts...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => renderPost(post))
        ) : (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>No posts found</p>
          </div>
        )}
      </div>

      {/* FAB Button */}
      <div
        style={styles.fab}
        onClick={() => setIsModalVisible(!isModalVisible)}
      >
        <span style={styles.fabText}>+</span>
      </div>

      {/* Modal */}
      {isModalVisible && (
        <div style={styles.modalOverlay} onClick={() => setIsModalVisible(false)}>
          <div style={styles.fabMenu} onClick={(e) => e.stopPropagation()}>
            <div style={styles.menuItem}>
              <span style={styles.menuText}>Podcast</span>
              <div style={styles.iconCircleWhite}
               onClick={navigateToCreatePodcast}
              >
                <IoMicOutline size={24} color="#00BFFF" 
               
                />
              </div>
            </div>
            <div style={styles.menuItem}>
              <span style={styles.menuText}>Post/Create Video</span>
              <div style={styles.iconCircleWhite}
               onClick={navigateToPostVideo}>
                <IoVideocamOutline size={24} color="#00BFFF" />
              </div>
            </div>
            <div style={styles.menuItem}>
              <span style={styles.menuText}>Write Article</span>
              <div style={styles.iconCircleWhite}
               onClick={navigateToWriteArticle}
               >
                <IoPencilOutline size={24} color="#00BFFF" />
              </div>
            </div>
            <div style={styles.menuItem}>
              <span style={styles.menuText}>Create Verse</span>
              <div style={styles.iconCircleWhite}
               onClick={navigateToCreateVerse}
              >
                <IoChatbubbleOutline size={24} color="#00BFFF" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {selectedPost && (
        <CommentModal
          visible={commentModalVisible}
          onClose={() => {
            setCommentModalVisible(false);
            setSelectedPost(null);
          }}
          contentId={selectedPost.id}
          contentType={selectedPost.type}
          onCommentAdded={() => {
            setPosts(posts.map(p => 
              p.id === selectedPost.id 
                ? { ...p, comment_count: (p.comment_count || 0) + 1 }
                : p
            ));
          }}
        />
      )}

      {/* Share Modal */}
      {selectedPost && (
        <SharePostModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setSelectedPost(null);
          }}
          postId={selectedPost.id}
          postType={selectedPost.type}
          title={selectedPost.title || selectedPost.content}
          description={selectedPost.content || selectedPost.description}
          imageUrl={selectedPost.cover_image_url || selectedPost.image_url}
          postUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/post/${selectedPost.id}`}
        />
      )}
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    minHeight: "100vh",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    paddingTop: "18px",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "10px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #f0f0f0",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: {
    width: "104px",
    height: "28px",
    objectFit: "contain",
  },
  headerIconButton: {
    border: "none",
    background: "transparent",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  scrollContent: {
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "120px",
    maxHeight: "100vh",
    overflowY: "auto",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    marginTop: "14px",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: "#333",
    fontSize: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  categoryContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "35px",
    overflowX: "auto",
    paddingBottom: "8px",
  },
  category: {
    minWidth: "100px",
    height: "35px",
    border: "1px solid #ccc",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryActive: {
    minWidth: "100px",
    height: "35px",
    backgroundColor: "#00BFFF",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  categoryText: {
    fontSize: "15px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  categoryTextActive: {
    fontSize: "15px",
    color: "#fff",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postContainer: {
    marginBottom: "20px",
    position: "relative",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
  },
  avatar: {
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    marginRight: "12px",
  },
  username: {
    fontWeight: "500",
    fontSize: "17px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  time: {
    fontSize: "14px",
    color: "#888",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postTitle: {
    fontSize: "17px",
    fontWeight: "400",
    marginBottom: "12px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  postText: {
    flex: 1,
    fontSize: "16px",
    fontWeight: "300",
    lineHeight: "24px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  thumbnail: {
    width: "100%",
    height: "200px",
    borderRadius: "12px",
    objectFit: "cover",
    marginRight: "12px",
  },
  fullWidthVideoWrapper: {
    marginLeft: "-20px",
    marginRight: "-20px",
    marginBottom: "12px",
  },
  videoWrapper: {
    position: "relative",
    width: "100%",
    height: "400px",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  muteIndicator: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: "12px",
    padding: "4px",
  },
  videoDescription: {
    marginTop: "12px",
    paddingLeft: "20px",
    paddingRight: "20px",
  },
  videoDescriptionText: {
    fontSize: "15px",
    color: "#555",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  rowContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "12px",
  },
  verseContainer: {
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  verseText: {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "16px",
    color: "#333",
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
    gap: "12px",
    marginTop: "16px",
    position: "relative",
    flexWrap: "nowrap",
  },
  iconText: {
    fontSize: "16px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  dateText: {
    fontSize: "16px",
    color: "#555",
    marginLeft: "12px",
    flex: 1,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  readMoreCircle: {
    width: "25px",
    height: "25px",
    borderRadius: "12px",
    border: "1px solid #00BFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    marginLeft: "auto",
  },
  separator: {
    height: "1px",
    backgroundColor: "#e0e0e0",
    marginTop: "16px",
    marginBottom: "20px",
  },
  fab: {
    position: "fixed",
    bottom: "160px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#00BFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    zIndex: 999,
  },
  fabText: {
    fontSize: "32px",
    color: "#fff",
    fontWeight: "300",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingBottom: "150px",
    paddingRight: "20px",
    zIndex: 1001,
  },
  fabMenu: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "20px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    cursor: "pointer",
  },
  menuText: {
    color: "#fff",
    fontSize: "20px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  iconCircleWhite: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 20px",
  },
  loadingText: {
    fontSize: "16px",
    color: "#888",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptyContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 20px",
  },
  emptyText: {
    fontSize: "16px",
    color: "#888",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};

export default Home;
