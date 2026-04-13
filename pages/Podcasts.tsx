// @ts-nocheck

import React, { useState, useRef, useEffect } from 'react';
import { IoSearch, IoMic, IoThumbsUpOutline, IoThumbsUp, IoNotificationsOutline, IoClose, IoEye, IoHeart, IoShareSocial } from 'react-icons/io5';
import { HiDotsHorizontal } from 'react-icons/hi';
import { MdAnalytics } from 'react-icons/md';
import { FiMessageCircle, FiBookmark } from 'react-icons/fi';
import MetaTags from '../components/MetaTags';
import { getPodcasts, toggleLike as apiToggleLike, getUserLikeStatusBatch, toggleBookmark as apiToggleBookmark, getUserBookmarkStatusBatch, trackShare } from '../components/api';
import { supabase } from '../components/supabase';
import { useRouter } from 'next/router';

const DUMMY_PODCASTS = [
  {
    id: '1',
    author_id: 'user1',
    username: 'Sarah Mitchell',
    title: 'The Future of Work: Remote vs. Hybrid Models',
    description: 'In this episode, we explore the evolving landscape of work environments post-pandemic. Featuring insights from industry leaders, we discuss the pros and cons of remote work, hybrid models, and the future of office spaces. Learn how companies are adapting their policies and what this means for employee satisfaction and productivity.',
    cover_image_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
    created_at: '2024-03-24T10:30:00Z',
    like_count: 342,
    comment_count: 67,
    view_count: 1850,
    category: 'Business',
    duration: 2640, // 44 minutes
    avatar_url: 'https://i.pravatar.cc/150?img=47',
    is_verified: true,
    is_boosted: false,
  },
  {
    id: '2',
    author_id: 'user2',
    username: 'David Chen',
    title: 'Mindfulness in the Digital Age',
    description: 'Join us as we dive deep into the practice of mindfulness and meditation in our hyper-connected world. We discuss practical techniques for staying present, managing digital distractions, and cultivating inner peace. Our guest expert shares science-backed methods that have helped thousands improve their mental wellbeing.',
    cover_image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    created_at: '2024-03-23T14:20:00Z',
    like_count: 528,
    comment_count: 94,
    view_count: 2340,
    category: 'Lifestyle',
    duration: 1980, // 33 minutes
    avatar_url: 'https://i.pravatar.cc/150?img=12',
    is_verified: true,
    is_boosted: true,
  },
  {
    id: '3',
    author_id: 'user3',
    username: 'Emily Rodriguez',
    title: 'AI and Machine Learning: Transforming Industries',
    description: 'Exploring how artificial intelligence and machine learning are revolutionizing everything from healthcare to finance. We break down complex concepts into digestible insights and discuss real-world applications that are changing the way businesses operate. Perfect for tech enthusiasts and curious minds alike.',
    cover_image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    created_at: '2024-03-22T09:15:00Z',
    like_count: 715,
    comment_count: 128,
    view_count: 3120,
    category: 'Tech',
    duration: 3300, // 55 minutes
    avatar_url: 'https://i.pravatar.cc/150?img=32',
    is_verified: false,
    is_boosted: false,
  },
  {
    id: '4',
    author_id: 'user4',
    username: 'Marcus Johnson',
    title: 'The Comedy of Everyday Life',
    description: 'Laugh along as we explore the humorous side of daily routines, awkward social situations, and the quirks that make us human. Featuring hilarious stories, celebrity interviews, and interactive segments with our listeners. A perfect dose of comedy to brighten your day and remind you not to take life too seriously.',
    cover_image_url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
    created_at: '2024-03-21T16:45:00Z',
    like_count: 892,
    comment_count: 156,
    view_count: 4280,
    category: 'Comedy',
    duration: 2580, // 43 minutes
    avatar_url: 'https://i.pravatar.cc/150?img=68',
    is_verified: true,
    is_boosted: false,
  },
  {
    id: '5',
    author_id: 'user5',
    username: 'Alexandra White',
    title: 'Building Better Learning Habits',
    description: 'Discover evidence-based strategies for effective learning and skill development. We discuss spaced repetition, active recall, and other proven techniques that can accelerate your learning journey. Whether you\'re a student, professional, or lifelong learner, this episode offers practical advice to help you learn smarter, not harder.',
    cover_image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
    created_at: '2024-03-20T11:00:00Z',
    like_count: 467,
    comment_count: 89,
    view_count: 2150,
    category: 'Education',
    duration: 2220, // 37 minutes
    avatar_url: 'https://i.pravatar.cc/150?img=45',
    is_verified: false,
    is_boosted: true,
  },
];

const CATEGORIES = [
  'For You',
  'Trending',
  'Business',
  'Tech',
  'Lifestyle',
  'Education',
  'Comedy',
  'Music',
  'News',
  'Sports',
];

const Podcasts = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('For You');
  const [likedPodcasts, setLikedPodcasts] = useState(new Set());
  const [bookmarkedPodcasts, setBookmarkedPodcasts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userAvatar, setUserAvatar] = useState('/avatar.jpg');
  const categoryRefs = useRef({});

  const router = useRouter();
  
  
  const navigateToCreatePodcast = () => {
    router.push('/create-podcast');
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPodcasts(30);
      setPodcasts(data);
      if (data.length > 0) {
        const items = data.map((p) => ({ id: p.id, type: 'podcast' }));
        const [likeStatuses, bookmarkStatuses] = await Promise.all([
          getUserLikeStatusBatch(items),
          getUserBookmarkStatusBatch(items),
        ]);
        setLikedPodcasts(new Set(Object.entries(likeStatuses).filter(([, v]) => v).map(([k]) => k.split('_')[0])));
        setBookmarkedPodcasts(new Set(Object.entries(bookmarkStatuses).filter(([, v]) => v).map(([k]) => k)));
      }
    } catch (err) {
      console.error('Error fetching podcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (podcastId) => {
    const nowLiked = !likedPodcasts.has(podcastId);
    setLikedPodcasts((prev) => { const s = new Set(prev); nowLiked ? s.add(podcastId) : s.delete(podcastId); return s; });
    setPodcasts((prev) => prev.map((p) => p.id === podcastId ? { ...p, like_count: (p.like_count || 0) + (nowLiked ? 1 : -1) } : p));
    await apiToggleLike(podcastId, 'podcast').catch(console.error);
  };

  const handleToggleBookmark = async (podcastId) => {
    const nowBookmarked = !bookmarkedPodcasts.has(podcastId);
    setBookmarkedPodcasts((prev) => { const s = new Set(prev); nowBookmarked ? s.add(podcastId) : s.delete(podcastId); return s; });
    await apiToggleBookmark(podcastId, 'podcast').catch(console.error);
  };

  const handleShare = async (podcastId) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/post/${podcastId}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    await trackShare(podcastId, 'podcast', 'copy_link').catch(console.error);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const filteredPodcasts = podcasts.filter(podcast => {
    const name = podcast.profiles?.full_name || podcast.username || '';
    const desc = podcast.description || '';
    const matchesSearch = searchTerm === '' || 
      (podcast.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'For You' || 
      selectedCategory === 'Trending' || 
      podcast.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <MetaTags
        title="Podcasts - Verrsa"
        description="Listen to engaging podcasts from creators on Verrsa. Discover stories, insights, and conversations about business, lifestyle, technology, and more."
        url={typeof window !== "undefined" ? window.location.href : ""}
        type="website"
      />
      <div style={{
      fontFamily: 'Instrument Sans, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
    }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        zIndex: 20,
        paddingTop: '18px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <img
            src="/verrsa-logo.png"
            alt="Verrsa"
            style={{
              width: '104px',
              height: '28px',
              objectFit: 'contain',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              aria-label="Notifications"
              style={{
                border: 'none',
                background: 'transparent',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IoNotificationsOutline size={22} color="#111" />
            </button>
            {isMobile && (
              <button
                type="button"
                aria-label="Open menu"
                onClick={navigateToMenu}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={userAvatar}
                  alt="Menu"
                  onError={(e) => { e.currentTarget.src = '/avatar.jpg'; }}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        style={{
          maxHeight: '100vh',
          overflowY: 'auto',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '120px',
        }}
      >
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          marginTop: '14px',
        }}>
          <IoSearch size={17} color="#888" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search Podcast/Creator"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              flex: 1,
              fontFamily: 'Instrument Sans, sans-serif',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IoClose size={20} color="#888" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="categories-scroll" style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '35px',
          paddingBottom: '8px',
        }}>
          {CATEGORIES.map(category => (
            <button
              key={category}
              ref={(el) => { categoryRefs.current[category] = el; }}
              onClick={() => {
                setSelectedCategory(category);
                categoryRefs.current[category]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: selectedCategory === category ? 'none' : '1px solid #ccc',
                backgroundColor: selectedCategory === category ? '#00BFFF' : 'transparent',
                color: selectedCategory === category ? '#fff' : '#333',
                fontSize: '15px',
                fontWeight: '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'Instrument Sans, sans-serif',
                minHeight: '35px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Podcasts List */}
        {filteredPodcasts.map((podcast, index) => (
          <div key={podcast.id}>
            <div style={{ marginBottom: '32px' }}>
              {/* Post Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <img
                  src={podcast.profiles?.avatar_url || podcast.avatar_url || '/avatar.jpg'}
                  alt={podcast.profiles?.full_name || podcast.username || 'User'}
                  style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '50%',
                    marginRight: '12px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '17px',
                      fontWeight: '500',
                      color: '#000',
                      cursor: 'pointer',
                    }}>
                      {podcast.profiles?.full_name || podcast.username || 'Unknown'}
                    </span>
                    {(podcast.profiles?.is_verified || podcast.is_verified) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#00BFFF">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    )}
                    {podcast.is_boosted && (
                      <span style={{
                        backgroundColor: '#00bfff',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}>
                        Promoted
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    color: '#888',
                  }}>
                    {formatTime(podcast.created_at)}
                  </span>
                </div>
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}>
                  <HiDotsHorizontal size={16} color="#888" />
                </button>
              </div>

              {/* Post Title */}
              <h3 style={{
                fontSize: '17px',
                fontWeight: '400',
                color: '#000',
                marginBottom: '12px',
                lineHeight: '1.4',
                cursor: 'pointer',
              }}>
                {podcast.title}
              </h3>

              {/* Post Description */}
              <p style={{
                fontSize: '16px',
                fontWeight: '300',
                color: '#666',
                lineHeight: '1.5',
                marginBottom: '12px',
              }}>
                {podcast.description.split(' ').slice(0, 20).join(' ')}
                {podcast.description.split(' ').length > 20 ? '...' : ''}
              </p>

              {/* Podcast Cover Image */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
                cursor: 'pointer',
              }}
            onClick={() => router.push(`/podcast/${podcast.id}`, { state: { podcast } })}
              
              >
                <img
                  src={podcast.cover_image_url}
                  alt={podcast.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Play Button Overlay 
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 191, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <IoMic size={28} color="#fff" />
                </div> */}
                {/* Duration Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {formatDuration(podcast.duration)}
                </div>
              </div>

              {/* Interaction Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => handleToggleLike(podcast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {likedPodcasts.has(podcast.id) ? (
                    <IoThumbsUp size={18} color="#00BFFF" />
                  ) : (
                    <IoThumbsUpOutline size={18} color="#666" />
                  )}
                </button>
                <span style={{ fontSize: '16px', color: '#000' }}>
                  {podcast.like_count}
                </span>

                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '4px',
                }}>
                  <MdAnalytics size={18} color="#888" />
                </button>
                <span style={{ fontSize: '16px', color: '#000' }}>
                  {podcast.view_count}
                </span>

                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '4px',
                }}>
                  <FiMessageCircle size={18} color="#666" />
                </button>
                <span style={{ fontSize: '16px', color: '#000' }}>
                  {podcast.comment_count}
                </span>

                <button
                  onClick={() => handleToggleBookmark(podcast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '4px',
                  }}
                >
                  <FiBookmark size={18} color={bookmarkedPodcasts.has(podcast.id) ? '#00BFFF' : '#666'} />
                </button>

                <button
                  onClick={() => handleShare(podcast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '4px',
                  }}
                >
                  <IoShareSocial size={18} color="#666" />
                </button>

                <span style={{
                  fontSize: '15px',
                  color: '#555',
                  marginLeft: '8px',
                  marginRight: 'auto',
                }}>
                  {formatDate(podcast.created_at)}
                </span>

                {/* Listen Now Circle */}
                {!podcast.is_boosted && (
                  <div style={{
                    width: '25px',
                    height: '25px',
                    borderRadius: '12px',
                    border: '1px solid #32CD32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <IoMic size={14} color="#32CD32" />
                  </div>
                )}

                {/* CTA Button for Boosted */}
                {podcast.is_boosted && (
                  <button style={{
                    backgroundColor: '#32CD32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'Instrument Sans, sans-serif',
                  }}>
                    <IoMic size={18} />
                    Listen Now
                  </button>
                )}
              </div>
            </div>

            {/* Separator */}
            {index < filteredPodcasts.length - 1 && (
              <div style={{
                height: '1px',
                backgroundColor: '#e0e0e0',
                marginBottom: '32px',
              }} />
            )}
          </div>
        ))}

        {/* Empty State */}
        {filteredPodcasts.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 20px',
          }}>
            <IoMic size={48} color="#ccc" />
            <p style={{
              fontSize: '18px',
              fontWeight: '500',
              color: '#666',
              marginTop: '16px',
            }}>
              {searchTerm ? `No podcasts found for "${searchTerm}"` : 'No podcasts available'}
            </p>
            <p style={{
              fontSize: '15px',
              color: '#999',
              marginTop: '8px',
            }}>
              {searchTerm ? 'Try a different search term' : 'Check back later for new content'}
            </p>
          </div>
        )}
      </div>

      {/* FAB Button */}
      <div
        style={styles.fab}
          onClick={navigateToCreatePodcast}
      >
        <span style={styles.fabText}>+</span>
      </div>

    </div>
    </>
  );
};


const styles = {
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
};

export default Podcasts;
