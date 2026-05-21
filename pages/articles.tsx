// @ts-nocheck

import React, { useState, useRef, useEffect } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import {
  IoThumbsUpOutline,
  IoThumbsUp,
  IoShareSocialOutline,
  IoBookmarkOutline,
  IoChatbubbleOutline,
  IoSearchOutline,
  IoPencilOutline,
} from "react-icons/io5";
import { MdAnalytics, MdArrowForwardIos } from "react-icons/md";
import { HiDotsHorizontal } from "react-icons/hi";
import CommentModal from '../components/CommentModal';
import SharePostModal from '../components/SharePostModal.web';
import MetaTags from '../components/MetaTags';
import VerificationBadge from '../components/VerificationBadge';
import { getArticles, toggleLike as apiToggleLike, getUserLikeStatusBatch, toggleBookmark as apiToggleBookmark, getUserBookmarkStatusBatch, trackShare } from '../components/api';
import { supabase } from '../components/supabase';
import { useRouter } from 'next/router';

// Dummy articles data
const DUMMY_ARTICLES = [
  {
    id: "article-1",
    title: "The Rise of Artificial Intelligence in Modern Healthcare",
    content: "Artificial intelligence is transforming healthcare delivery by enabling faster diagnoses, personalized treatment plans, and predictive analytics. Machine learning algorithms can now detect diseases in medical imaging with accuracy rivaling human experts. From drug discovery to patient care management, AI is revolutionizing every aspect of medicine. This technological shift promises to make healthcare more accessible, efficient, and effective for patients worldwide.",
    cover_image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    user: "Dr. Emily Chen",
    user_id: "user-1",
    profiles: {
      full_name: "Dr. Emily Chen",
      avatar_url: "/avatar.jpg",
      is_verified: true,
    },
    created_at: new Date().toISOString(),
    time: "3:45 pm",
    like_count: 342,
    comment_count: 28,
    view_count: 2400,
    is_boosted: false,
  },
  {
    id: "article-2",
    title: "Sustainable Living: A Complete Guide to Reducing Your Carbon Footprint",
    content: "Climate change is one of the most pressing challenges of our time, and every individual action counts. This comprehensive guide explores practical ways to live more sustainably, from choosing renewable energy sources to adopting a plant-based diet. Learn how small daily changes in your lifestyle can collectively make a significant impact on our planet's future. Discover tips for reducing waste, conserving water, and making eco-friendly choices in every aspect of your life.",
    cover_image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
    user: "Sarah Green",
    user_id: "user-2",
    profiles: {
      full_name: "Sarah Green",
      avatar_url: "/avatar.jpg",
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    time: "2:30 pm",
    like_count: 567,
    comment_count: 45,
    view_count: 3800,
    is_boosted: true,
  },
  {
    id: "article-3",
    title: "The Psychology of Productivity: Understanding How Your Mind Works",
    content: "Productivity isn't just about working harder—it's about understanding how your brain functions and optimizing your work patterns accordingly. Research in cognitive psychology reveals fascinating insights about focus, motivation, and peak performance. This article explores evidence-based strategies for enhancing productivity, from the Pomodoro Technique to understanding your chronotype. Learn how to work with your natural rhythms rather than against them, and discover why taking breaks is essential for sustained high performance.",
    cover_image_url: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800",
    user: "Michael Torres",
    user_id: "user-3",
    profiles: {
      full_name: "Michael Torres",
      avatar_url: "/avatar.jpg",
      is_verified: true,
    },
    created_at: new Date(Date.now() - 7200000).toISOString(),
    time: "1:15 pm",
    like_count: 234,
    comment_count: 19,
    view_count: 1900,
    is_boosted: false,
  },
  {
    id: "article-4",
    title: "Blockchain Beyond Cryptocurrency: Real-World Applications",
    content: "While Bitcoin brought blockchain into the mainstream, this revolutionary technology has applications far beyond digital currencies. From supply chain management to secure voting systems, blockchain is transforming industries worldwide. This article examines how major companies are leveraging blockchain for transparency, security, and efficiency. Explore use cases in healthcare records, real estate transactions, and identity verification. Understanding blockchain technology is becoming essential for anyone interested in the future of digital innovation.",
    cover_image_url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800",
    user: "David Kim",
    user_id: "user-4",
    profiles: {
      full_name: "David Kim",
      avatar_url: "/avatar.jpg",
    },
    created_at: new Date(Date.now() - 10800000).toISOString(),
    time: "11:45 am",
    like_count: 189,
    comment_count: 31,
    view_count: 2100,
    is_boosted: false,
  },
  {
    id: "article-5",
    title: "The Future of Remote Work: Trends Shaping the Modern Workplace",
    content: "The pandemic accelerated a workplace revolution that was already underway. Remote work is no longer a temporary solution but a permanent shift in how we think about employment. This article explores emerging trends in distributed teams, from virtual reality meetings to asynchronous collaboration tools. Learn how companies are adapting their cultures, policies, and technologies to support remote workers effectively. Discover the challenges and opportunities of this new era of work, and what it means for your career.",
    cover_image_url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800",
    user: "Jennifer Lopez",
    user_id: "user-5",
    profiles: {
      full_name: "Jennifer Lopez",
      avatar_url: "/avatar.jpg",
      is_verified: true,
    },
    created_at: new Date(Date.now() - 14400000).toISOString(),
    time: "10:00 am",
    like_count: 421,
    comment_count: 52,
    view_count: 3200,
    is_boosted: true,
  },
];

const CATEGORIES = ["For You", "All", "Technology", "Health", "Business", "Lifestyle", "Education"];

function Articles() {
  const [articles, setArticles] = useState([]);
  const [likedArticles, setLikedArticles] = useState(new Set());
  const [bookmarkedArticles, setBookmarkedArticles] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("For You");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReportMenu, setShowReportMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userAvatar, setUserAvatar] = useState('/avatar.jpg');
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

    fetchUserAvatar();
  }, []);

   const navigateToPost = (postId) => {
    if (postId) router.push(`/post/${postId}`);
  };

  const navigateToWriteArticle = () => {
    router.push('/write-article');
  };

  const navigateToMenu = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).__openVerrsaMobileMenu) {
        (window as any).__openVerrsaMobileMenu();
        return;
      }
      window.location.assign('/menu');
      return;
    }
    router.push('/menu');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getArticles(30);
      setArticles(data);
      if (data.length > 0) {
        const items = data.map((a) => ({ id: a.id, type: 'article' }));
        const [likeStatuses, bookmarkStatuses] = await Promise.all([
          getUserLikeStatusBatch(items),
          getUserBookmarkStatusBatch(items),
        ]);
        setLikedArticles(new Set(Object.entries(likeStatuses).filter(([, v]) => v).map(([k]) => k.split('_')[0])));
        setBookmarkedArticles(new Set(Object.entries(bookmarkStatuses).filter(([, v]) => v).map(([k]) => k)));
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (articleId) => {
    const nowLiked = !likedArticles.has(articleId);
    setLikedArticles((prev) => { const s = new Set(prev); nowLiked ? s.add(articleId) : s.delete(articleId); return s; });
    setArticles((prev) => prev.map((a) => a.id === articleId ? { ...a, like_count: (a.like_count || 0) + (nowLiked ? 1 : -1) } : a));
    await apiToggleLike(articleId, 'article').catch(console.error);
  };

  const handleToggleBookmark = async (articleId) => {
    const nowBookmarked = !bookmarkedArticles.has(articleId);
    setBookmarkedArticles((prev) => { const s = new Set(prev); nowBookmarked ? s.add(articleId) : s.delete(articleId); return s; });
    await apiToggleBookmark(articleId, 'article').catch(console.error);
  };

  const handleShare = async (article) => {
    setSelectedArticle(article);
    setShareModalVisible(true);
  };

  const handleComment = (article) => {
    setSelectedArticle(article);
    setCommentModalVisible(true);
  };

  const getTruncatedContent = (text, maxWords) => {
    const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) return "";
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  const renderArticle = (item) => {
    const userName = item.profiles?.full_name || item.user;
    const userAvatar = item.profiles?.avatar_url || "/avatar.jpg";
    const displayContent = getTruncatedContent(item.content, 25);

    return (
      <div key={item.id} style={styles.postContainer}>
        {/* Post Header */}
        <div style={styles.postHeader}>
          <img src={userAvatar} alt="Avatar" style={styles.avatar} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.username}>{userName}</span>
              {item.profiles?.is_verified && (
                <VerificationBadge size={14} />
              )}
              {item.is_boosted && (
                <span style={styles.promotedBadge}>Promoted</span>
              )}
            </div>
            <span style={styles.time}>{item.time}</span>
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

        {/* Article Title */}
        <div style={{ cursor: "pointer" }}>
          <h3 style={styles.postTitle}>{item.title}</h3>
        </div>

        {/* Article Content */}
        <div style={{ cursor: "pointer" }}
        // onClick={() => router.push(`/article/${item.id}`, { state: { article: item } })}
         onClick={ () => router.push(`/post/${item.id}`) }
        >
          <div style={styles.rowContent}>
              <p style={styles.postText}>{displayContent}</p>
            <img
              src={item.cover_image_url}
              alt="Article"
              style={styles.thumbnail}
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/300x200";
              }}
            />
          
          </div>
        </div>

        {/* Icon Row */}
        <div style={styles.iconRow}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => handleToggleLike(item.id)}
          >
            {likedArticles.has(item.id) ? (
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

          <div style={{ cursor: "pointer" }} onClick={() => handleToggleBookmark(item.id)}>
            <IoBookmarkOutline size={18} color={bookmarkedArticles.has(item.id) ? "#00BFFF" : "#888"} />
          </div>

          <div style={{ cursor: "pointer" }} onClick={() => handleShare(item)}>
            <IoShareSocialOutline size={18} color="#888" />
          </div>

          <span style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
            })}
          </span>

          {/* Read More Button */}
          {item.is_boosted ? (
            <div style={{ ...styles.ctaButton, backgroundColor: "#FF6347" }}>
              <MdAnalytics size={18} color="#fff" style={{ marginRight: "8px" }} />
              <span style={styles.ctaButtonText}>View Now</span>
            </div>
          ) : (
            <div style={styles.readMoreCircle}>
              <MdArrowForwardIos size={14} color="#00BFFF" />
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
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <MetaTags
        title="Articles - Verrsa"
        description="Discover insightful articles from creators on Verrsa. Read about technology, health, business, lifestyle, education, and more."
        url={typeof window !== "undefined" ? window.location.href : ""}
        type="website"
      />
      <div style={styles.container}>
      <div style={styles.stickyHeader}>
        <div style={styles.headerRow}>
          <img src="/verrsa-logo.png" alt="Verrsa" style={styles.headerLogo} />
          <div style={styles.headerActions}>
            <button type="button" style={styles.headerIconButton} aria-label="Notifications">
              <IoMdNotificationsOutline size={22} color="#111" />
            </button>
            {isMobile && (
              <button type="button" style={styles.headerAvatarButton} aria-label="Open menu" onClick={navigateToMenu}>
                <img src={userAvatar} alt="Menu" style={styles.avatarSmall} onError={(e) => { e.currentTarget.src = '/avatar.jpg'; }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.scrollContent}>
        {/* Search Section */}
        <div style={styles.searchContainer}>
          <IoSearchOutline size={17} color="#888" style={{ marginRight: "8px" }} />
          <input
            type="text"
            placeholder="Search Article/Creator"
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/*Articles */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading articles...</p>
          </div>
        ) : articles.length > 0 ? (
          articles.map((article) => renderArticle(article))
        ) : (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>No articles found</p>
          </div>
        )}
      </div>

      {/* FAB Button */}
      <div style={styles.fab}>
        <IoPencilOutline size={24} color="#fff" 
         onClick={navigateToWriteArticle}
        />
      </div>

      {/* Comment Modal */}
      {selectedArticle && (
        <CommentModal
          visible={commentModalVisible}
          onClose={() => {
            setCommentModalVisible(false);
            setSelectedArticle(null);
          }}
          contentId={selectedArticle.id}
          contentType="article"
          onCommentAdded={() => {
            setArticles(articles.map(a => 
              a.id === selectedArticle.id 
                ? { ...a, comment_count: (a.comment_count || 0) + 1 }
                : a
            ));
          }}
        />
      )}

      {/* Share Modal */}
      {selectedArticle && (
        <SharePostModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setSelectedArticle(null);
          }}
          postId={selectedArticle.id}
          postType="article"
          title={selectedArticle.title}
          description={selectedArticle.content}
          imageUrl={selectedArticle.cover_image_url}
          postUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/article/${selectedArticle.id}`}
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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headerAvatarButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  avatarSmall: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover",
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
    color: "#333",
    backgroundColor: "transparent",
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
  promotedBadge: {
    fontSize: "11px",
    color: "#00BFFF",
    backgroundColor: "#E3F2FD",
    padding: "2px 8px",
    borderRadius: "10px",
    fontWeight: "600",
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
    marginBottom: "12px",
  },
  rowContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "12px",
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
  ctaButton: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    marginLeft: "auto",
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
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
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 20px",
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

export default Articles;
