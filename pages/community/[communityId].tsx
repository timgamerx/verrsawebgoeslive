// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { spacing, radius, fontSize, fontFamily } from '../../lib/theme';
import { TbChevronLeft, TbChevronRight, TbDots, TbDotsVertical } from 'react-icons/tb';
import { supabase } from '../../components/supabase';
import { MdAdd, MdArrowBack, MdArrowForward, MdBlock, MdCheck, MdClose, MdDelete, MdEdit, MdFavorite, MdHome, MdNotifications, MdPerson, MdRemove, MdReport, MdSearch, MdSettings, MdShare, MdStar, MdVerified, MdGroupAdd, MdExitToApp, MdAddBox, MdPeople, MdVideocam, MdPushPin, MdVisibility, MdChatBubbleOutline } from 'react-icons/md';
import VerificationBadge from '../../components/VerificationBadge';
import SharePostModal from '../../components/SharePostModal.web';
import CommentModal from '../../components/CommentModal';
import { trackView, incrementViewCount } from '../../components/api';
import {
  sendFollowNotification,
  sendCommunityNotification,
} from '../../lib/pushNotifications';
import { notifyNewCommunityMembers } from '../../lib/notificationService';
import { renderTextWithLinks } from '../../lib/linkUtils';
import { updateCommunityLastActive } from '../../lib/communityActivityTracker';
import { useTheme } from '../../context/ThemeProvider';
import { getActiveModerationExclusions } from '../../lib/moderationExclusions';
import { IoChevronBack, IoChevronForward, IoVideocam, IoThumbsUp, IoThumbsUpOutline, IoFlagOutline } from 'react-icons/io5'
import { FiShare2, FiMessageCircle } from 'react-icons/fi'

const CommunityProfile = () => {
  const router = useRouter();
  const { communityId } = router.query;
  const { theme, colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<"recents" | "media" | "about">(
    "recents",
  );
  const [showGoLive, setShowGoLive] = useState(false);
  const [community, setCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikeCounts, setPostLikeCounts] = useState<{
    [key: string]: number;
  }>({});
  const [postCommentCounts, setPostCommentCounts] = useState<{
    [key: string]: number;
  }>({});
  const [postViewCounts, setPostViewCounts] = useState<{
    [key: string]: number;
  }>({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSubscription, setUserSubscription] = useState<string>("free");
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  // ── Join prompt state ───────────────────────────────────────────────────
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joiningFromPrompt, setJoiningFromPrompt] = useState(false);
  const [selectedSharePost, setSelectedSharePost] = useState<any>(null);
  // ───────────────────────────────────────────────────────────────────────

  const isMember = useMemo(
    () => members.some((member) => member.user_id === currentUser?.id),
    [members, currentUser],
  );

  // Get communityId from Next.js router query

  // Clean the communityId if it contains path separators
  const cleanCommunityId = React.useMemo(() => {
    if (!communityId || typeof communityId !== 'string') return communityId;
    
    // If it contains slashes or encoded slashes, extract the UUID
    if (communityId.includes('/') || communityId.includes('%2F') || communityId.includes('%252F')) {
      console.warn("CommunityProfile: Detected path in communityId, cleaning:", communityId);
      
      // Try to extract UUID from the end
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const match = communityId.match(uuidRegex);
      
      if (match) {
        console.log("CommunityProfile: Extracted clean UUID:", match[0]);
        return match[0];
      }
      
      // Fallback: try splitting and taking the last part
      const parts = communityId.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && uuidRegex.test(lastPart)) {
        console.log("CommunityProfile: Extracted UUID from path:", lastPart);
        return lastPart;
      }
    }
    
    return communityId;
  }, [communityId]);

  // Deep link: redirect mobile users to the native app
  useEffect(() => {
    if (typeof window === 'undefined' || !cleanCommunityId) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    if (!isIOS && !isAndroid) return;

    const appUrl = `verrsa://community/${cleanCommunityId}`;
    const iosStoreUrl = 'https://apps.apple.com/us/app/verrsa/id6756518229';
    const androidStoreUrl = `https://play.google.com/store/apps/details?id=com.verrsaapp.verrsa`;

    window.location.href = appUrl;

    const storeTimeout = setTimeout(() => {
      if (isIOS) window.location.href = iosStoreUrl;
      else window.location.href = androidStoreUrl;
    }, 1500);

    const onVisibilityChange = () => {
      if (document.hidden) clearTimeout(storeTimeout);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(storeTimeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cleanCommunityId]);

  // Validate communityId and redirect to Community if invalid
  useEffect(() => {
    // Skip validation during initial mount to avoid premature redirects
    if (!cleanCommunityId) return;
    
    let shouldRedirect = false;
    let redirectReason = "";
    
    // Check if communityId is "profile" or contains "profile/" (corrupted URL)
    if (cleanCommunityId === "profile" || 
        (typeof cleanCommunityId === "string" && cleanCommunityId.includes("profile/"))) {
      shouldRedirect = true;
      redirectReason = "corrupted profile path";
    }
    
    // Additional validation: check if it looks like a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!shouldRedirect && !uuidRegex.test(cleanCommunityId)) {
      shouldRedirect = true;
      redirectReason = "invalid UUID format";
    }
    
    if (shouldRedirect) {
      console.warn(`CommunityProfile: Invalid communityId (${redirectReason}):`, cleanCommunityId, "- redirecting to CommunityFeed");
      
      // Use replace to avoid adding to history stack
      const timer = setTimeout(() => {
        try {
          router.push("/Community");
        } catch (error) {
          console.error("Navigation error:", error);
          // Fallback: try navigating to home
          try {
            router.push("/home");
          } catch (e) {
            console.error("Fallback navigation error:", e);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [cleanCommunityId]);

  // Helper function to parse images
  const getPostImages = (post: any) => {
    if (!post.images) return [];

    // If images is already an array, return it
    if (Array.isArray(post.images)) {
      return post.images.filter((url) => url && typeof url === "string");
    }

    // If images is a string (JSON), try to parse it
    if (typeof post.images === "string") {
      try {
        const parsed = JSON.parse(post.images);
        if (Array.isArray(parsed)) {
          return parsed.filter((url) => url && typeof url === "string");
        }
      } catch (e) {
        // If parsing fails, treat as single URL
        return [post.images];
      }
    }

    return [];
  };

  useEffect(() => {
    if (cleanCommunityId) {
      // Track view when community profile is accessed
      trackView(cleanCommunityId, "community");

      // Track community activity
      updateCommunityLastActive(cleanCommunityId);

      getCurrentUser();
      fetchCommunity(true);
      fetchMembers();
      fetchCommunityPosts();
      checkLiveStatus();
    }
  }, [cleanCommunityId]);

  // Refresh posts when returning to this screen (Next.js version)
  useEffect(() => {
    const handleRouteChange = () => {
      if (cleanCommunityId) {
        fetchCommunityPosts();
        checkLiveStatus();
        updateCommunityLastActive(cleanCommunityId);
      }
    };

    router.events?.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [cleanCommunityId, router.events]);

  useEffect(() => {
    console.log("Members state updated:", members);
    console.log("Members length:", members.length);
  }, [members]);

  // Show join prompt after 4 seconds when a non-member views a community
  useEffect(() => {
    if (!community || isMember || loading) return;
    const STORAGE_KEY = `community_join_prompt_${cleanCommunityId}`;
    const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
    let timer: ReturnType<typeof setTimeout>;
    const checkPrompt = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const last = parseInt(raw, 10);
        if (!isNaN(last) && Date.now() - last < COOLDOWN_MS) return;
      }
      timer = setTimeout(() => setShowJoinPrompt(true), 4000);
    };
    
    checkPrompt();
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?.id, isMember, loading]);

  const handleJoinFromPrompt = async () => {
    const STORAGE_KEY = `community_join_prompt_${cleanCommunityId}`;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShowJoinPrompt(false);
    setJoiningFromPrompt(true);
    try {
      await handleJoinCommunity();
    } finally {
      setJoiningFromPrompt(false);
    }
  };

  const dismissJoinPrompt = async () => {
    const STORAGE_KEY = `community_join_prompt_${cleanCommunityId}`;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShowJoinPrompt(false);
  };

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);

        // Fetch user's subscription tier
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          setUserSubscription(profile.subscription_plan || "free");
        }
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchUserFollowStatuses = async (userIds: string[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || userIds.length === 0) return;

      // Check if follows table exists and fetch following relationships
      const { data: follows, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", userIds);

      if (error) {
        // Table doesn't exist yet, silently skip
        if (error.code === "PGRST205") {
          return;
        }
        console.error("Error fetching follow statuses:", error);
        return;
      }

      const followedUserIds = new Set(
        follows?.map((follow) => follow.following_id) || [],
      );
      setFollowedUsers(followedUserIds);
    } catch (error) {
      console.error("Error fetching follow statuses:", error);
    }
  };

  const fetchCommunity = async (showLoading: boolean = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const { excludedUserIds } = await getActiveModerationExclusions();
      const { data, error } = await supabase
        .from("community")
        .select("*")
        .eq("id", cleanCommunityId)
        .single();

      if (error) {
        console.error("Error fetching community:", error);
      } else {
        if (excludedUserIds.has(String(data?.created_by || ""))) {
          setCommunity(null);
          setCreatorProfile(null);
          setCommunityPosts([]);
          setMembers([]);
          setLoading(false);
          return;
        }
        console.log("Fetched community:", data);
        setCommunity(data);

        // Fetch creator profile
        if (data?.created_by) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", data.created_by)
            .single();

          if (profileError) {
            console.error("Error fetching creator profile:", profileError);
          } else {
            console.log("Fetched creator profile:", profileData);
            setCreatorProfile(profileData);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchCommunity:", error);
    }
    setLoading(false);
  };

  const fetchCommunityPosts = async () => {
    try {
      console.log("Fetching community posts for:", cleanCommunityId);
      const { excludedPostKeys, excludedUserIds } =
        await getActiveModerationExclusions();
      const blockedIds = await (
        await import("../../lib/blockUtils")
      ).fetchBlockedUserIds();

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          content,
          images,
          video_url,
          video_duration,
          like_count,
          comment_count,
          view_count,
          is_pinned,
          created_at,
          updated_at,
          user_id
        `,
        )
        .eq("post_type", "community_post")
        .eq("community_id", cleanCommunityId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error fetching community posts:", postsError);
        setCommunityPosts([]);
        return;
      }

      console.log("Fetched community posts:", postsData);

      if (postsData && postsData.length > 0) {
        // Exclude posts from blocked authors
        const filteredPostsData = postsData.filter((p) => {
          const authorId = String(p.user_id || "");
          const postKey = `${p.id}_community_post`;
          if (blockedIds.length && blockedIds.includes(p.user_id)) return false;
          if (excludedUserIds.has(authorId)) return false;
          if (excludedPostKeys.has(postKey)) return false;
          return true;
        });
        // Get user profiles for post authors
        const userIds = [
          ...new Set(filteredPostsData.map((post) => post.user_id)),
        ];

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, subscription_tier")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching post author profiles:", profilesError);
          setCommunityPosts(filteredPostsData);
        } else {
          // Attach profile data to posts
          const postsWithProfiles = filteredPostsData.map((post) => ({
            ...post,
            author_profile:
              profilesData?.find((profile) => profile.id === post.user_id) ||
              null,
          }));

          console.log("Posts with profiles:", postsWithProfiles);
          setCommunityPosts(postsWithProfiles);

          // Initialize view counts from the posts data, but preserve any local increments
          setPostViewCounts((prevCounts) => {
            const viewCounts: { [key: string]: number } = {};
            postsWithProfiles.forEach((post) => {
              // Use the higher value between database and local state to preserve increments
              viewCounts[post.id] = Math.max(
                post.view_count || 0,
                prevCounts[post.id] || 0,
              );
            });
            return viewCounts;
          });

          // Fetch user like statuses for these posts
          fetchUserLikeStatuses(postsWithProfiles.map((p) => p.id));

          // Fetch like counts for all posts from community_post_likes table
          fetchPostLikeCounts(postsWithProfiles.map((p) => p.id));

          // Fetch comment counts for all posts from comments table
          fetchPostCommentCounts(postsWithProfiles.map((p) => p.id));

          // Fetch follow statuses for post authors
          const authorIds = [
            ...new Set(postsWithProfiles.map((post) => post.user_id)),
          ];
          fetchUserFollowStatuses(authorIds);
        }
      } else {
        console.log("No posts found for community");
        setCommunityPosts([]);
      }
    } catch (error) {
      console.error("Error in fetchCommunityPosts:", error);
      setCommunityPosts([]);
    }
  };

  const fetchUserLikeStatuses = async (postIds: string[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || postIds.length === 0) return;

      const { data: likes, error } = await supabase
        .from("likes")
        .select("content_id")
        .eq("user_id", user.id)
        .eq("content_type", "community_post")
        .in("content_id", postIds);

      if (error) {
        console.error("Error fetching user like statuses:", error);
        return;
      }

      const likedPostIds = new Set(likes?.map((like) => like.content_id) || []);
      setLikedPosts(likedPostIds);
    } catch (error) {
      console.error("Error fetching user like statuses:", error);
    }
  };

  const fetchPostLikeCounts = async (postIds: string[]) => {
    try {
      if (postIds.length === 0) return;

      // Fetch like counts for all posts from unified likes table
      const likeCounts: { [key: string]: number } = {};

      for (const postId of postIds) {
        const { count, error } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("content_id", postId)
          .eq("content_type", "community_post");

        if (error) {
          console.error(`Error fetching like count for post ${postId}:`, error);
          likeCounts[postId] = 0;
        } else {
          likeCounts[postId] = count || 0;
        }
      }

      setPostLikeCounts(likeCounts);
    } catch (error) {
      console.error("Error fetching post like counts:", error);
    }
  };

  const fetchPostCommentCounts = async (postIds: string[]) => {
    try {
      if (postIds.length === 0) return;

      const { data, error } = await supabase
        .from("comments")
        .select("content_id")
        .eq("content_type", "community_post")
        .in("content_id", postIds);

      if (error) {
        console.error("Error fetching post comment counts:", error);
        return;
      }

      const commentCounts: { [key: string]: number } = {};
      postIds.forEach((id) => { commentCounts[id] = 0; });
      data?.forEach((row) => {
        commentCounts[row.content_id] = (commentCounts[row.content_id] || 0) + 1;
      });

      setPostCommentCounts(commentCounts);
    } catch (error) {
      console.error("Error fetching post comment counts:", error);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Don't allow following yourself
      if (user.id === userId) return;

      const isFollowing = followedUsers.has(userId);

      // Optimistic update
      if (isFollowing) {
        setFollowedUsers(
          (prev) => new Set([...prev].filter((id) => id !== userId)),
        );
      } else {
        setFollowedUsers((prev) => new Set([...prev, userId]));
      }

      // Update database
      if (isFollowing) {
        // Unfollow
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (deleteError && deleteError.code !== "PGRST205") {
          throw deleteError;
        }
      } else {
        // Follow
        const { error: insertError } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });

        if (insertError && insertError.code !== "PGRST205") {
          throw insertError;
        }

        // Send push notification to the user being followed
        try {
          const userName = user.user_metadata?.full_name || "Someone";
          await sendFollowNotification(userId, userName, user.id);
        } catch (notifError) {
          console.error("Failed to send follow notification:", notifError);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update on error
      fetchUserFollowStatuses([userId]);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setShowDeleteMenu(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        window.alert("You must be logged in to delete posts");
        return;
      }

      // Delete from database with owner verification
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("post_type", "community_post")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting post:", error);
        window.alert("Failed to delete post. Please try again.");
        return;
      }

      // Remove from local state
      setCommunityPosts((prevPosts) =>
        prevPosts.filter((p) => p.id !== postId),
      );

      window.alert("Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      window.alert("Failed to delete post. Please try again.");
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const isLiked = likedPosts.has(postId);

      // Optimistic update
      if (isLiked) {
        setLikedPosts(
          (prev) => new Set([...prev].filter((id) => id !== postId)),
        );
        setPostLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 0) - 1),
        }));
      } else {
        setLikedPosts((prev) => new Set([...prev, postId]));
        setPostLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }

      // Update database
      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("content_id", postId)
          .eq("content_type", "community_post")
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;
      } else {
        // Like
        const { error: insertError } = await supabase
          .from("likes")
          .insert({ content_id: postId, content_type: "community_post", user_id: user.id });

        if (insertError) throw insertError;
      }

      // Fetch updated like count and sync to posts table
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("content_id", postId)
        .eq("content_type", "community_post");

      const newCount = count || 0;
      setPostLikeCounts((prev) => ({ ...prev, [postId]: newCount }));
      await supabase
        .from("posts")
        .update({ like_count: newCount })
        .eq("id", postId);
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      fetchPostLikeCounts([postId]);
    }
  };

  // Handle view increment (matching Home approach)
  const handleViewIncrement = async (
    postId: string,
    contentType: "community",
  ) => {
    try {
      // Update local state immediately for better UX
      setPostViewCounts((prevCounts) => ({
        ...prevCounts,
        [postId]: (prevCounts[postId] || 0) + 1,
      }));

      setCommunityPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                view_count: (post.view_count || 0) + 1,
              }
            : post,
        ),
      );

      // Direct Supabase update to posts table view_count
      // First get current view count
      const { data: currentData, error: fetchError } = await supabase
        .from("posts")
        .select("view_count")
        .eq("id", postId)
        .eq("post_type", "community_post")
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Then increment and update
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          view_count: (currentData?.view_count || 0) + 1,
        })
        .eq("id", postId)
        .eq("post_type", "community_post");

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error("Error incrementing view count:", error);

      // Revert local state on error
      setPostViewCounts((prevCounts) => ({
        ...prevCounts,
        [postId]: Math.max((prevCounts[postId] || 0) - 1, 0),
      }));

      setCommunityPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                view_count: Math.max((post.view_count || 0) - 1, 0),
              }
            : post,
        ),
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getCurrentUser(),
        fetchCommunityPosts(),
        fetchMembers(),
        fetchCommunity(false),
        checkLiveStatus(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMembers = async () => {
    try {
      console.log("Fetching members for community:", cleanCommunityId);
      const { excludedUserIds } = await getActiveModerationExclusions();

      // Try the simpler manual join approach first
      const { data: membersData, error: membersError } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", cleanCommunityId)
        .order("joined_at", { ascending: true });

      console.log("Members data:", membersData);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        setMembers([]);
        return;
      }

      if (membersData && membersData.length > 0) {
        const filteredMembersData = membersData.filter(
          (member) => !excludedUserIds.has(String(member.user_id || "")),
        );
        // Get all user IDs
        const userIds = filteredMembersData.map((member) => member.user_id);
        console.log("User IDs to fetch profiles for:", userIds);

        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);

        console.log("Profiles data:", profilesData);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          // Still set members without profile data
          setMembers(filteredMembersData);
        } else {
          // Manually join the data
          const membersWithProfiles = filteredMembersData.map((member) => ({
            ...member,
            profiles:
              profilesData?.find((profile) => profile.id === member.user_id) ||
              null,
          }));

          console.log("Final members with profiles:", membersWithProfiles);
          setMembers(membersWithProfiles);
        }
      } else {
        console.log("No members found for community");
        setMembers([]);
      }
    } catch (error) {
      console.error("Error in fetchMembers:", error);
      setMembers([]);
    }
  };

  const handleJoinCommunity = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.alert("Please sign in to join this community.");
        return;
      }

      if (user.id === community?.created_by) {
        window.alert("You already own this community.");
        return;
      }

      // Check existing membership
      const { data: existing, error: checkError } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", cleanCommunityId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking membership:", checkError);
      }
      if (existing) {
        window.alert("You're already a member.");
        return;
      }

      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: cleanCommunityId, user_id: user.id });
      if (error) throw error;

      // Send push notification to community owner
      try {
        if (community && community.created_by !== user.id) {
          const userName = user.user_metadata?.full_name || "Someone";
          await sendCommunityNotification(
            community.created_by,
            "New Member! 🎉",
            `${userName} joined ${community.name}`,
            cleanCommunityId,
          );
          // Preference-aware notification to community owner
          await notifyNewCommunityMembers(
            community.created_by,
            community.name,
            cleanCommunityId,
            1,
          );
        }
      } catch (notifError) {
        console.error("Failed to send community notification:", notifError);
      }

      await fetchMembers();
      window.alert("Welcome to the community!");
    } catch (error) {
      console.error("Error joining community:", error);
      window.alert("Could not join. Please try again.");
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.alert("Please sign in to leave.");
        return;
      }

      if (user.id === community?.created_by) {
        window.alert("Community owners cannot leave. Transfer ownership or delete the community.");
        return;
      }

      const { data: existing, error: checkError } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", cleanCommunityId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        window.alert("You're not currently a member.");
        return;
      }

      if (window.confirm("Are you sure you want to leave this community?")) {
        try {
          const { error } = await supabase
            .from("community_members")
            .delete()
            .eq("community_id", cleanCommunityId)
            .eq("user_id", user.id);
          if (error) throw error;

          await fetchMembers();
          window.alert("You have left the community.");
        } catch (err) {
          console.error("Error leaving community:", err);
          window.alert("Could not leave. Please try again.");
        }
      }
    } catch (error) {
      console.error("Leave community error:", error);
      window.alert("Could not leave. Please try again.");
    }
  };

  const handleBlockCommunity = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.alert("Please sign in to block.");
        return;
      }

      // Prevent blocking if owner
      if (user.id === community?.created_by) {
        window.alert("You cannot block your own community.");
        return;
      }

      // Only members can block a community
      if (!isMember) {
        window.alert("Join this community to block it.");
        return;
      }

      // Check existing block
      const { data: existingBlock } = await supabase
        .from("blocked_communities")
        .select("id")
        .eq("community_id", cleanCommunityId)
        .eq("blocked_by", user.id)
        .maybeSingle();
      if (existingBlock) {
        window.alert("You have already blocked this community.");
        return;
      }

      if (window.confirm("You won't see content from this community. Continue?")) {
        try {
          const { error } = await supabase
            .from("blocked_communities")
            .insert({ community_id: cleanCommunityId, blocked_by: user.id });
          if (error) throw error;
          window.alert("Community blocked.");
          router.push("/Community");
        } catch (err) {
          console.error("Error blocking community:", err);
          window.alert("Failed to block. Please try again.");
        }
      }
    } catch (error) {
      console.error("Block community error:", error);
    }
  };

  const checkLiveStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, is_active")
        .eq("community_id", cleanCommunityId)
        .eq("is_active", true)
        .single();

      if (error) {
        // PGRST116 means no rows found, which is normal when not live
        if (error.code === "PGRST116") {
          setIsLive(false);
        } else {
          console.error("Error checking live status:", error);
          setIsLive(false);
        }
        return;
      }

      // Only set to true if we actually have data and it's active
      setIsLive(data && data.is_active === true);
    } catch (error) {
      console.error("Error checking live status:", error);
      setIsLive(false);
    }
  };

  // Validate communityId for rendering
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidCommunityId = cleanCommunityId && cleanCommunityId !== "profile" && 
    (!cleanCommunityId.includes || !cleanCommunityId.includes("profile/")) && 
    uuidRegex.test(cleanCommunityId);

  // 🔹 Memoized tab switching functions (moved before Header)
  const handleTabSwitch = useCallback((tab: "recents" | "media" | "about") => {
    setActiveTab(tab);
  }, []);

  const handleGoLiveToggle = useCallback(() => {
    setShowGoLive((prev) => !prev);
  }, []);

  const handleShareModalToggle = useCallback(() => {
    setShowShareModal((prev) => {
      if (prev) setSelectedSharePost(null);
      return !prev;
    });
  }, []);

  const handleGoLiveClose = useCallback(() => {
    setShowGoLive(false);
  }, []);

  // 🔹 Memoized Header to prevent re-renders on tab/modal changes
  const Header = useMemo(
    () => (
      <div>
        <img
          src={
            community?.cover_image_url
              ? community.cover_image_url
              : "/positivity-life2.jpg"
          }
          style={styles.coverImage}
        />
        <button
          onClick={() => {
            router.back();
          }}
          style={{
            position: "absolute",
            top: 65,
            left: 10,
            zIndex: 1,
            backgroundColor: isDarkMode
              ? "rgba(0, 0, 0, 0.5)"
              : "rgba(255, 255, 255, 0.5)",
            borderRadius: radius.xl2,
            padding: spacing.xs,
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TbChevronLeft />
        </button>

        {/* Overflow menu button (available to all users) */}
        <button
          style={{
            position: "absolute",
            top: 60,
            right: 10,
            zIndex: 1,
            backgroundColor: isDarkMode
              ? "rgba(0, 0, 0, 0.5)"
              : "rgba(255, 255, 255, 0.5)",
            borderRadius: radius.xl2,
            padding: spacing.sm,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleGoLiveToggle();
          }}
        >
          <TbDotsVertical size={24} color={theme.icon || "#333"} />
        </button>
        {showGoLive && (
          <div
            style={{
              position: "absolute",
              top: 100,
              right: 10,
              backgroundColor: theme.cardBackground,
              padding: spacing.sm,
              borderRadius: radius.md,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              zIndex: 10,
              minWidth: 150,
            }}
          >
            {/* Join / Leave community */}
            {!isMember ? (
              <button
                style={{
                  paddingTop: spacing.md,
    paddingBottom: spacing.md,
                  paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onClick={() => {
                  handleGoLiveClose();
                  handleJoinCommunity();
                }}
              >
                <MdGroupAdd size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                <span style={{ fontSize: fontSize.base, color: theme.text }}>
                  Join Community
                </span>
              </button>
            ) : (
              currentUser?.id !== community?.created_by && (
                <button
                  style={{
                    paddingTop: spacing.md,
    paddingBottom: spacing.md,
                    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    handleGoLiveClose();
                    handleLeaveCommunity();
                  }}
                >
                  <MdExitToApp size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                  <span style={{ fontSize: fontSize.base, color: theme.text }}>
                    Leave Community
                  </span>
                </button>
              )
            )}

            {/* Block community - only visible to members who are not owners */}
            {isMember && currentUser?.id !== community?.created_by && (
              <button
                style={{
                  paddingTop: spacing.md,
    paddingBottom: spacing.md,
                  paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onClick={() => {
                  handleGoLiveClose();
                  handleBlockCommunity();
                }}
              >
                <MdBlock size={20} color="#e53935" style={{ marginRight: spacing.md }} />
                <span style={{ fontSize: fontSize.base, color: "#e53935" }}>
                  Block Community
                </span>
              </button>
          )}
            {/* Go Live Option - Only for community owner with subscription */}
            {currentUser?.id === community?.created_by && (
              <button
                style={{
                  paddingTop: spacing.md,
    paddingBottom: spacing.md,
                  paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onClick={() => {
                  handleGoLiveClose();

                  // Allow all community owners to go live (subscription check removed)
                  router.push("/community-live");
                }}
              >
                <MdVideocam size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: fontSize.base, color: theme.text }}>
                    Go Live
                  </span>
                </div>
                <IoVideocam size={18} color="#00BFFF" />
              </button>
          )}
            {/* Make a New Post Option - Only for community owner and members */}
            {(currentUser?.id === community?.created_by || isMember) && (
              <button
                style={{
                  paddingTop: spacing.md,
    paddingBottom: spacing.md,
                  paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onClick={() => {
                  handleGoLiveClose();
                  router.push("/create-community-post");
                }}
              >
                <MdAddBox size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                <span style={{ fontSize: fontSize.base, color: theme.text }}>
                  Make a New Post
                </span>
              </button>
          )}
            {/* Edit Community Info Option - Only for community owner */}
            {currentUser?.id === community?.created_by && (
              <>
                <button
                  style={{
                    paddingTop: spacing.md,
    paddingBottom: spacing.md,
                    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    handleGoLiveClose();
                    router.push("/edit-community");
                  }}
                >
                  <MdEdit size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                  <span style={{ fontSize: fontSize.base, color: theme.text }}>
                    Edit Community Info
                  </span>
                </button>

                {/* See Community Members Option - Only for community owner */}
                <button
                  style={{
                    paddingTop: spacing.md,
    paddingBottom: spacing.md,
                    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    handleGoLiveClose();
                    router.push("/community-members");
                  }}
                >
                  <MdPeople size={20} color={theme.icon || "#333"} style={{ marginRight: spacing.md }} />
                  <span style={{ fontSize: fontSize.base, color: theme.text }}>
                    See Community Members
                  </span>
                </button>

                {/* Delete Community Option - Only for community owner */}
                <button
                  style={{
                    paddingTop: spacing.md,
    paddingBottom: spacing.md,
                    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    handleGoLiveClose();
                    if (window.confirm(`Are you sure you want to permanently delete "${community?.name}"? This action cannot be undone and will remove all posts, members, and content associated with this community.`)) {
                      (async () => {
                        try {
                          const { error } = await supabase
                            .from("community")
                            .delete()
                            .eq("id", cleanCommunityId);
                          if (error) throw error;
                          window.alert("Community has been permanently deleted.");
                          router.push("/Community");
                        } catch (error) {
                          console.error("Error deleting community:", error);
                          window.alert("Could not delete community. Please try again.");
                        }
                      })();
                    }
                  }}
                >
                  <MdDelete size={20} color="#e53935" style={{ marginRight: spacing.sm }} />
                  <span style={{ fontSize: fontSize.base, color: "#e53935" }}>
                    Delete Community
                  </span>
                </button>
              </>
            )}
          </div>
      )}
        <div
          style={{...(styles.headerContent || {}), backgroundColor: theme.background}}
        >
          <div
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{...(styles.title || {}), color: theme.text}}>
              {community?.name || "Community"}
            </span>
            <div
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <button
                style={{ marginRight: spacing.md, background: "none", border: "none", cursor: "pointer" }}
                onClick={handleShareModalToggle}
              >
                <FiShare2 size={20} color={theme.icon || "#333"} />
              </button>
              <button
                onClick={() => router.push("/notification")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <MdNotifications size={24} color={theme.icon || "#333"} />
              </button>
            </div>
          </div>
          <div
            style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm }}
          >
            {/* Show up to 3 member avatars */}
            {members.slice(0, 3).map((m, i) => (
              <img
                key={m.user_id || i}
                src={m.profiles?.avatar_url || "/avatar.png"}
                style={i === 0 ? styles.avatarImage : styles.avatarImageTwo}
              />
            ))}
            <span style={{...(styles.subtitle || {}), color: theme.secondaryText}}>
              {members.length} Members
            </span>
          </div>

          <span style={{...(styles.description || {}), color: theme.secondaryText}}>
            {community?.description}
          </span>
        </div>
      </div>
    ),
    [
      community,
      members.length,
      router,
      cleanCommunityId,
      showGoLive,
      currentUser?.id,
      handleGoLiveToggle,
      handleGoLiveClose,
      handleShareModalToggle,
      isLive,
      theme,
      isDarkMode,
    ],
  );

  // 🔹 Join Live Banner (shown when community is live)
  const LiveBanner = useMemo(
    () =>
      isLive ? (
        <button
          style={styles.liveBanner}
          onClick={() => {
            router.push("/community-live");
          }}
        >
          <div style={styles.liveBannerContent}>
            <div style={styles.liveIndicator}>
              <div style={styles.liveDot} />
              <span style={styles.liveText}>LIVE NOW</span>
            </div>
            <span style={styles.liveBannerTitle}>
              {community?.name} is streaming live!
            </span>
            <span style={styles.liveBannerSubtitle}>
              Tap to join the live stream
            </span>
          </div>
          <IoChevronForward />
        </button>
      ) : null,
    [isLive, cleanCommunityId, community?.name],
  );

  // 🔹 Tabs component (separate from Header to prevent unnecessary re-renders)
  const Tabs = useMemo(
    () => (
      <div
        style={{...(styles.tabRow || {}), backgroundColor: theme.background,
            borderBottomColor: theme.border,}}
      >
        <button onClick={() => handleTabSwitch("recents")}>
          <span
            style={{...(styles.tabText || {}), color: theme.secondaryText, ...(activeTab === "recents" ? {
                ...styles.activeTab,
                color: "#00bfff",
                borderColor: "#00bfff",
              } : {})}}
          >
            Recents
          </span>
        </button>
        <button onClick={() => handleTabSwitch("media")}>
          <span
            style={{...(styles.tabText || {}), color: theme.secondaryText, ...(activeTab === "media" ? {
                ...styles.activeTab,
                color: "#00bfff",
                borderColor: "#00bfff",
              } : {})}}
          >
            Media
          </span>
        </button>
        <button onClick={() => handleTabSwitch("about")}>
          <span
            style={{...(styles.tabText || {}), color: theme.secondaryText, ...(activeTab === "about" ? {
                ...styles.activeTab,
                color: "#00bfff",
                borderColor: "#00bfff",
              } : {})}}
          >
            About
          </span>
        </button>
      </div>
    ),
    [activeTab, handleTabSwitch, theme],
  );

  // 🔹 Recents content
  const Recents = () => {
    if (communityPosts.length === 0) {
      return (
        <div
          style={{...(styles.postCard || {}), alignItems: "center",
              padding: spacing.lg,
              backgroundColor: theme.background,}}
        >
          <span style={{ color: theme.secondaryText, fontSize: fontSize.base }}>
            No posts yet
          </span>
          <span
            style={{
              color: theme.secondaryText,
              fontSize: fontSize.md,
              marginTop: spacing.xs,
              opacity: 0.7,
            }}
          >
            Be the first to post in this community!
          </span>
        </div>
      );
    }

    return (
      <div>
        {communityPosts.map((post) => (
          <div
            key={post.id}
            style={{...(styles.postCard || {}), backgroundColor: theme.background}}
          >
            <div style={styles.postHeader}>
              <div
                style={{
                  flexDirection: "row",
                  alignSelf: "flex-start",
                  marginTop: spacing.base,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <img
                  src={
                    post.author_profile?.avatar_url
                      ? post.author_profile.avatar_url
                      : "/assets/../assets/avatar.jpg"
                  }
                  style={{...(styles.profileImage || {}), marginRight: spacing.xs}}
                />

                <div
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    flex: 1,
                  }}
                >
                  <div style={{ flexDirection: "row", alignItems: "center" }}>
                    <span style={{...(styles.profileName || {}), color: theme.text}}>
                      {community?.name}
                    </span>
                    {community?.is_verified && <VerificationBadge size={14} style={{ marginLeft: spacing.xs }} />}
                  </div>
                  <div style={{ flexDirection: "row", alignItems: "center" }}>
                    <div
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <span
                        style={{...(styles.profileOwnerName || {}), color: theme.secondaryText}}
                      >
                        {post.author_profile?.full_name ||
                          post.author_profile?.username ||
                          "Unknown User"}
                      </span>
                      {(post.author_profile?.subscription_tier === "basic" ||
                        post.author_profile?.subscription_tier ===
                          "premium") && (
                        <VerificationBadge
                          size={14}
                          style={{ marginLeft: spacing.xs }}
                        />
                      )}
                    </div>
                    <span
                      style={{...(styles.feedbacksTime || {}), color: theme.secondaryText}}
                    >
                      • {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {/* Show delete button if user is post owner or community owner */}
                {currentUser &&
                  (currentUser.id === post.user_id ||
                    currentUser.id === community?.created_by) && (
                    <div>
                      <button
                        onClick={() => {
                          setShowDeleteMenu(
                            showDeleteMenu === post.id ? null : post.id,
                          );
                        }}
                      >
                        <TbDots />
                      </button>
                      {showDeleteMenu === post.id && (
                        <>
                          <button
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 0,
                            }}
                            onClick={() => {
                              setShowDeleteMenu(null);
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: 25,
                              right: 0,
                              backgroundColor: "#fff",
                              padding: spacing.sm,
                              borderRadius: radius.md,
                              elevation: 5,
                              shadowColor: "#000",
                              shadowOffset: {
                                width: 0,
                                height: 2,
                              },
                              shadowOpacity: 0.25,
                              shadowRadius: 3.84,
                              zIndex: 10,
                              minWidth: 150,
                            }}
                          >
                            <button
                              style={{
                                paddingTop: spacing.md,
    paddingBottom: spacing.md,
                                paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                              onClick={() => {
                                setShowDeleteMenu(null);
                                if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) { handleDeletePost(post.id) }
                              }}
                            >
                              <MdDelete size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                              <span style={{ fontSize: fontSize.base, color: "#FF3B30" }}>
                                Delete Post
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                )}
                {/* Only show follow button if not the community owner, not the post owner, and not following yourself */}
                {currentUser &&
                  currentUser.id !== community?.created_by &&
                  currentUser.id !== post.user_id && (
                    <button
                      style={{...(styles.followBtn || {}), ...(followedUsers.has(post.user_id) ? {
                          backgroundColor: "#f0f0f0",
                        } : {})}}
                      onClick={() => handleToggleFollow(post.user_id)}
                    >
                      <span
                        style={{...(styles.followText || {}), ...(followedUsers.has(post.user_id) ? { color: "#666" } : {})}}
                      >
                        {followedUsers.has(post.user_id)
                          ? `Following ${
                              post.author_profile?.full_name?.split(" ")[0] ||
                              "User"
                            }`
                          : `Follow ${
                              post.author_profile?.full_name?.split(" ")[0] ||
                              "User"
                            }`}
                      </span>
                    </button>
                          )}
              </div>
            </div>

            {/* Post Title */}
            {post.title && (
              <span
                style={{...(styles.postText || {}), fontWeight: "bold", fontSize: fontSize.lg, color: theme.text}}
              >
                {post.title}
              </span>
          )}
            {/* Post Content with clickable links */}
            {renderTextWithLinks(
              post.content,
              [styles.postText, { color: theme.text }],
              "#00bfff",
            )}

            {/* Post Images */}
            {(() => {
              const images = getPostImages(post);
              if (images.length === 0) return null;

              if (images.length === 1) {
                return (
                  <button
                    onClick={() => {
                      if (post.id) {
                        trackView(post.id, "community");
                      }
                      router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                    }}
                    style={{ marginTop: spacing.base }}
                  >
                    <img
                      src={images[0] }
                      style={{
                        width: "100%",
                        height: undefined,
                        aspectRatio: 1,
                        borderRadius: radius.md,
                        marginTop: spacing.md,
    marginBottom: spacing.md,
                      }}
                      
                    />
                  </button>
                );
              }

              return (
                <button
                  onClick={() => {
                    if (post.id) {
                      trackView(post.id, "community");
                    }
                    router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                  }}
                  style={{ marginTop: spacing.base }}
                >
                  <div style={{overflowY: "auto", flex: 1}}>
                    {images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl }
                        style={{
                          width: 300,
                          height: 300,
                          borderRadius: radius.md,
                          marginRight: index === images.length - 1 ? 0 : 10,
                        }}
                        
                      />
                    ))}
                  </div>
                </button>
              );
            })()}

            {/* Post Video */}
            {post.video_url && (
              <button
                onClick={() => {
                  if (post.id) {
                    trackView(post.id, "community");
                  }
                  router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                }}
                style={{
                  marginTop: spacing.base,
                  marginBottom: spacing.md,
                  marginLeft: -28,
    marginRight: -28,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 300,
                    borderRadius: radius.none,
                    overflow: "hidden",
                    backgroundColor: "#000",
                    position: "relative",
                  }}
                >
                  <video
                    src={post.video_url}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                      paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
                      borderRadius: radius.xs,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <IoVideocam size={14} color="#fff" />
                    <span
                      style={{ color: "#fff", fontSize: fontSize.sm, marginLeft: spacing.xs }}
                    >
                      {post.video_duration
                        ? `${Math.ceil(post.video_duration / 60000)} min`
                        : "Video"}
                    </span>
                  </div>
                </div>
              </button>
          )}
            {/* Post Stats */}
            <div style={{...styles.iconRow, display: "flex"}}>
              <button onClick={() => handleToggleLike(post.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {likedPosts.has(post.id) ? (
                  <IoThumbsUp size={18} color="#00bfff" />
                ) : (
                  <IoThumbsUpOutline size={18} color="#666" />
                )}
              </button>
              <span style={styles.iconText}>
                {postLikeCounts[post.id] || 0}
              </span>

              <button disabled style={{ background: "none", border: "none", display: "flex", alignItems: "center" }}>
                <MdEye size={18} color="#666" />
              </button>
              <span style={styles.iconText}>
                {postViewCounts[post.id] || post.view_count || 0}
              </span>

              <button
                onClick={() => {
                  setSelectedComment(post);
                  setShowCommentModal(true);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <FiMessageCircle size={18} color="#666" />
              </button>
              <span style={styles.iconText}>{postCommentCounts[post.id] ?? post.comment_count ?? 0}</span>

              <button onClick={() => { setSelectedSharePost(post); setShowShareModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <FiShare2 size={18} color="#666" />
              </button>

              {post.is_pinned && (
                <MdPushPin size={16} color="#00BFFF" />
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginTop: spacing.base,
                opacity: 0.3,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // \ud83d\udd39 Media content
  const Media = () => {
    const mediaPostsFiltered = communityPosts.filter(
      (post) => getPostImages(post).length > 0 || post.video_url,
    );

    if (mediaPostsFiltered.length === 0) {
      return (
        <div
          style={{...(styles.postCard || {}), alignItems: "center",
              padding: spacing.lg,
              backgroundColor: theme.cardBackground,}}
        >
          <span style={{ color: theme.secondaryText, fontSize: fontSize.base }}>
            No media posts yet
          </span>
          <span
            style={{
              color: theme.secondaryText,
              fontSize: fontSize.md,
              marginTop: spacing.xs,
              opacity: 0.7,
            }}
          >
            Share some photos or videos with the community!
          </span>
        </div>
      );
    }

    return (
      <div>
        {mediaPostsFiltered.map((post) => (
          <div
            key={post.id}
            style={{...(styles.postCard || {}), backgroundColor: theme.background}}
          >
            <div
              style={{
                flexDirection: "row",
                alignSelf: "flex-start",
                marginTop: spacing.base,
                alignItems: "center",
                width: "100%",
              }}
            >
              <img
                src={
                  post.author_profile?.avatar_url
                    ? post.author_profile.avatar_url
                    : "/assets/../assets/avatar.jpg"
                }
                style={{...(styles.profileImage || {}), marginRight: spacing.xs}}
              />

              <div
                style={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  flex: 1,
                }}
              >
                <div style={{ flexDirection: "row", alignItems: "center" }}>
                  <span style={{...(styles.profileName || {}), color: theme.text}}>
                    {community?.name}
                  </span>
                </div>
                <div style={{ flexDirection: "row", alignItems: "center" }}>
                  <div style={{ flexDirection: "row", alignItems: "center" }}>
                    <span
                      style={{...(styles.profileOwnerName || {}), color: theme.secondaryText}}
                    >
                      {post.author_profile?.full_name ||
                        post.author_profile?.username ||
                        "Unknown User"}
                    </span>
                    {(post.author_profile?.subscription_tier === "basic" ||
                      post.author_profile?.subscription_tier === "premium") && (
                      <VerificationBadge size={14} style={{ marginLeft: spacing.xs }} />
                    )}
                  </div>
                  <span
                    style={{...(styles.feedbacksTime || {}), color: theme.secondaryText}}
                  >
                    • {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {/* Show delete button if user is post owner or community owner */}
              {currentUser &&
                (currentUser.id === post.user_id ||
                  currentUser.id === community?.created_by) && (
                  <div>
                    <button
                      onClick={() => {
                        setShowDeleteMenu(
                          showDeleteMenu === post.id ? null : post.id,
                        );
                      }}
                    >
                      <TbDots />
                    </button>
                    {showDeleteMenu === post.id && (
                      <>
                        <button
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 0,
                          }}
                          onClick={() => {
                            setShowDeleteMenu(null);
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 25,
                            right: 0,
                            backgroundColor: "#fff",
                            padding: spacing.sm,
                            borderRadius: radius.md,
                            elevation: 5,
                            shadowColor: "#000",
                            shadowOffset: {
                              width: 0,
                              height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            zIndex: 10,
                            minWidth: 150,
                          }}
                        >
                          <button
                            style={{
                              paddingTop: spacing.md,
    paddingBottom: spacing.md,
                              paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                            onClick={() => {
                              setShowDeleteMenu(null);
                              if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) { handleDeletePost(post.id) }
                            }}
                          >
                            <MdDelete size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                            <span style={{ fontSize: fontSize.base, color: "#FF3B30" }}>
                              Delete Post
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
              )}
              {/* Only show follow button if not the community owner, not the post owner, and not following yourself */}
              {currentUser &&
                currentUser.id !== community?.created_by &&
                currentUser.id !== post.user_id && (
                  <button
                    style={{...(styles.followBtn || {}), ...(followedUsers.has(post.user_id) ? {
                        backgroundColor: "#f0f0f0",
                      } : {})}}
                    onClick={() => handleToggleFollow(post.user_id)}
                  >
                    <span
                      style={{...(styles.followText || {}), ...(followedUsers.has(post.user_id) ? { color: "#666" } : {})}}
                    >
                      {followedUsers.has(post.user_id)
                        ? `Following ${
                            post.author_profile?.full_name?.split(" ")[0] ||
                            "User"
                          }`
                        : `Follow ${
                            post.author_profile?.full_name?.split(" ")[0] ||
                            "User"
                          }`}
                    </span>
                  </button>
                        )}
            </div>

            {/* Post Title */}
            {post.title && (
              <span
                style={{...(styles.postText || {}), fontWeight: "bold", fontSize: fontSize.base, color: theme.text}}
              >
                {post.title}
              </span>
          )}
            {/* Post Content with clickable links */}
            {renderTextWithLinks(
              post.content,
              [styles.postText, { color: theme.text }],
              "#00bfff",
            )}

            {/* Post Images - Show all images for media tab */}
            {(() => {
              const images = getPostImages(post);
              if (images.length === 0) return null;

              if (images.length === 1) {
                return (
                  <button
                    onClick={() => {
                      if (post.id) {
                        trackView(post.id, "community");
                      }
                      router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                    }}
                    style={{ marginTop: spacing.base }}
                  >
                    <img
                      src={images[0] }
                      style={{
                        width: "100%",
                        height: undefined,
                        aspectRatio: 1,
                        borderRadius: radius.md,
                        marginTop: spacing.md,
    marginBottom: spacing.md,
                      }}
                      
                    />
                  </button>
                );
              }

              return (
                <button
                  onClick={() => {
                    if (post.id) {
                      trackView(post.id, "community");
                    }
                    router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                  }}
                  style={{ marginTop: spacing.base }}
                >
                  <div style={{overflowY: "auto", flex: 1}}>
                    {images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl }
                        style={{
                          width: 300,
                          height: 300,
                          borderRadius: radius.md,
                          marginRight: index === images.length - 1 ? 0 : 10,
                        }}
                        
                      />
                    ))}
                  </div>
                </button>
              );
            })()}

            {/* Post Video */}
            {post.video_url && (
              <button
                onClick={() => {
                  if (post.id) {
                    trackView(post.id, "community");
                  }
                  router.push(`/communitypost?postId=${post.id}&communityId=${cleanCommunityId}`);
                }}
                style={{
                  marginTop: spacing.base,
                  marginBottom: spacing.md,
                  marginLeft: -12,
    marginRight: -12,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 300,
                    borderRadius: radius.none,
                    overflow: "hidden",
                    backgroundColor: "#000",
                    position: "relative",
                  }}
                >
                  <video
                    src={post.video_url}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                      paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
                      borderRadius: radius.xs,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <IoVideocam size={14} color="#fff" />
                    <span
                      style={{ color: "#fff", fontSize: fontSize.sm, marginLeft: spacing.xs }}
                    >
                      {post.video_duration
                        ? `${Math.ceil(post.video_duration / 60000)} min`
                        : "Video"}
                    </span>
                  </div>
                </div>
              </button>
          )}
            {/* Post Stats */}
            <div style={{...styles.iconRow, display: "flex"}}>
              <button onClick={() => handleToggleLike(post.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {likedPosts.has(post.id) ? (
                  <IoThumbsUp size={18} color="#00bfff" />
                ) : (
                  <IoThumbsUpOutline size={18} color="#666" />
                )}
              </button>
              <span style={{...(styles.iconText || {}), color: theme.secondaryText}}>
                {postLikeCounts[post.id] || 0}
              </span>

              <button disabled style={{ background: "none", border: "none", display: "flex", alignItems: "center" }}>
                <MdEye size={18} color="#666" />
              </button>
              <span style={{...(styles.iconText || {}), color: theme.secondaryText}}>
                {postViewCounts[post.id] || post.view_count || 0}
              </span>

              <button
                onClick={() => {
                  setSelectedComment(post);
                  setShowCommentModal(true);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <FiMessageCircle size={18} color="#666" />
              </button>
              <span style={{...(styles.iconText || {}), color: theme.secondaryText}}>
                {postCommentCounts[post.id] ?? post.comment_count ?? 0}
              </span>

              <button onClick={() => { setSelectedSharePost(post); setShowShareModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <FiShare2 size={18} color="#666" />
              </button>

              {post.is_pinned && (
                <MdPushPin size={16} color="#00BFFF" />
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginTop: spacing.base,
                opacity: 0.3,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // 🔹 About content
  const About = () => (
    <div style={{...(styles.aboutBox || {}), backgroundColor: theme.background}}>
      <div
        style={{...(styles.headerContent || {}), backgroundColor: theme.background}}
      >
        <div
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{...(styles.title || {}), color: theme.text}}>
            {community?.name || "Community"}
          </span>
          {isLive && (
            <div style={styles.liveBadge}>
              <span style={styles.liveText}>🟢 LIVE</span>
            </div>
        )}
          <div
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          ></div>
        </div>
        <div
          style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm }}
        >
          {/* Show up to 3 member avatars */}
          {members.slice(0, 3).map((m, i) => (
            <img
              key={m.user_id || i}
              src={m.profiles?.avatar_url || "/avatar.png"}
              style={i === 0 ? styles.avatarImage : styles.avatarImageTwo}
            />
          ))}
          <span style={{...(styles.subtitle || {}), color: theme.secondaryText}}>
            {members.length} Members
          </span>
        </div>

        <span style={{...(styles.description || {}), color: theme.secondaryText}}>
          {community?.description || "No description available"}
        </span>
      </div>
      <div style={{ flexDirection: "row", alignItems: "center" }}>
        <MdCheck size={16} color="#00BFFF" style={{ marginRight: 8 }} />
        <span style={{...(styles.aboutBoxText || {}), color: theme.secondaryText}}>
          Only community members can post
        </span>
      </div>
      <div style={{ flexDirection: "row", alignItems: "center" }}>
        <MdPerson size={16} color="#00BFFF" style={{ marginRight: 8 }} />
        <span style={{...(styles.aboutBoxText || {}), color: theme.secondaryText}}>
          {community?.is_private
            ? "Invitation required to join this community"
            : "Anyone can join this community"}
        </span>
      </div>
      <div style={{ flexDirection: "row", alignItems: "center" }}>
        <FiMessageCircle size={16} color="#00BFFF" style={{ marginRight: 8 }} />
        <span style={{...(styles.aboutBoxText || {}), color: theme.secondaryText}}>
          All sorts of posts are allowed
        </span>
      </div>
      <div style={{ flexDirection: "row", alignItems: "center" }}>
        <MdStar size={16} color="#00BFFF" style={{ marginRight: 8 }} />
        <span style={{...(styles.aboutBoxText || {}), color: theme.secondaryText}}>
          Created on{" "}
          {community?.created_at
            ? new Date(community.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Unknown date"}
        </span>
      </div>
      <div style={{ flexDirection: "row", alignItems: "center" }}>
        <MdPerson size={16} color="#00BFFF" style={{ marginRight: 8 }} />
        <span style={{...(styles.aboutBoxText || {}), color: theme.secondaryText}}>
          Created by{" "}
          {creatorProfile?.full_name ||
            creatorProfile?.username ||
            "Unknown user"}
        </span>
      </div>
    </div>
  );

  // Handle invalid communityId
  if (!isValidCommunityId) {
    return (
      <div style={{...(styles.container || {}), backgroundColor: theme.background, justifyContent: "center", alignItems: "center"}}>
        <span style={{ color: theme.secondaryText }}>Redirecting...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
        <span style={{ margin: spacing.xl2, color: theme.secondaryText }}>
          Loading community...
        </span>
      </div>
    );
  }
  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background, overflowY: "auto"}}
    >
      {Header}
      {LiveBanner}
      {Tabs}
      {activeTab === "recents" && <Recents />}
      {activeTab === "media" && <Media />}
      {activeTab === "about" && <About />}

      {/* Share Modal — community-level or per-post depending on context */}
      <SharePostModal
        visible={showShareModal}
        onClose={handleShareModalToggle}
        title={selectedSharePost
          ? (selectedSharePost.title || selectedSharePost.content?.substring(0, 60) || community?.name)
          : community?.name}
        url={selectedSharePost
          ? `https://www.verrsa.org/community/${communityId}/post/${selectedSharePost.id}`
          : `https://www.verrsa.org/community/${communityId}`}
        postId={selectedSharePost ? selectedSharePost.id : (communityId as string)}
        postType={selectedSharePost ? "communitypost" : "community"}
        imageUrl={selectedSharePost
          ? (getPostImages(selectedSharePost)[0] || community?.cover_image_url || '')
          : (community?.cover_image_url || '')}
        description={selectedSharePost
          ? (selectedSharePost.content?.substring(0, 120) || '')
          : `Join ${community?.name || 'this community'} on Verrsa!`}
      />

      {/* Comment Modal */}
      {selectedComment && showCommentModal && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedComment(null);
          }}
          contentId={selectedComment.id}
          contentType="community_post"
        />
      )}

      {/* Join Community Prompt Modal */}
      {(showJoinPrompt) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
        <button
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={dismissJoinPrompt}
        />
        <div
          style={{
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: spacing.xl,
            paddingBottom: spacing.xl5,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* Community image */}
          {community?.cover_image_url || community?.avatar_url ? (
            <img
              src={community.cover_image_url || community.avatar_url }
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                alignSelf: "center",
                marginBottom: spacing.base,
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: "#00BFFF22",
                alignSelf: "center",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: spacing.base,
              }}
            >
              <MdPeople size={36} color="#00BFFF" />
            </div>
        )}
          <span
            style={{
              fontSize: fontSize.xl2,
              fontWeight: "700",
              color: theme.text,
              textAlign: "center",
              marginBottom: spacing.xs,
            }}
          >
            Join {community?.name}
          </span>

          {community?.description ? (
            <span
              style={{
                fontSize: fontSize.base,
                color: theme.secondaryText,
                textAlign: "center",
                marginBottom: spacing.base,
                lineHeight: 22,
              }}
              
            >
              {community.description}
            </span>
          ) : null}

          <span
            style={{
              fontSize: fontSize.sm2,
              color: theme.secondaryText,
              textAlign: "center",
              marginBottom: spacing.lg,
            }}
          >
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>

          {/* Join button */}
          <button
            onClick={handleJoinFromPrompt}
            disabled={joiningFromPrompt}
            style={{
              backgroundColor: "#00BFFF",
              borderRadius: radius.lg,
              paddingTop: spacing.base,
    paddingBottom: spacing.base,
              alignItems: "center",
              marginBottom: spacing.sm,
              opacity: joiningFromPrompt ? 0.7 : 1,
            }}
          >
            {joiningFromPrompt ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : (
              <span style={{ color: "#fff", fontWeight: "600", fontSize: fontSize.base }}>
                Join Community
              </span>
            )}
          </button>

          {/* Later button */}
          <button
            onClick={dismissJoinPrompt}
              style={{
                alignItems: "center",
                paddingTop: spacing.sm,
                paddingBottom: spacing.sm,
              }}
          >
            <span style={{ color: theme.secondaryText, fontSize: fontSize.base }}>
              Maybe Later
            </span>
          </button>
        </div>
      </div>
            )}
    </div>
  );
};

export default CommunityProfile;

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1 },
  coverImage: { width: "100%", height: 180 },
  headerContent: { padding: spacing.base },
  title: { fontSize: fontSize.xl, fontWeight: "400", marginBottom: -8 },
  subtitle: { fontSize: fontSize.lg, marginBottom: spacing.xs, marginTop: 3 },
  description: { fontSize: fontSize.base, marginTop: spacing.sm, lineHeight: 22 },

  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  tabText: { fontSize: fontSize.base },
  activeTab: {
    fontWeight: "bold",
    borderBottomWidth: 2,
  },

  postCard: {
    margin: spacing.base,
    borderRadius: radius.none,
    padding: spacing.md,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postName: { fontWeight: "400", fontSize: fontSize.md },
  followBtn: {
    backgroundColor: "#00AEEF",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.xs,
  },
  postText: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
    marginBottom: -10,
    fontSize: fontSize.base,
    fontWeight: "200",
    fontFamily: fontFamily.regular,
  },
  postImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1,
    borderRadius: radius.md,
    marginTop: 25,
    marginBottom: spacing.md,
  },

  aboutBox: {
    margin: spacing.base,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  aboutBoxText: {
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
    lineHeight: 30,
    fontFamily: fontFamily.regular,
    marginLeft: spacing.base,
  },
  profileImage: { width: 40, height: 40, borderRadius: radius.xl2 },
  profileName: { fontWeight: "400", fontSize: fontSize.lg, marginBottom: -5 },
  profileOwnerName: { fontSize: fontSize.base },
  feedbacksTime: { fontSize: fontSize.sm, marginLeft: spacing.xs },
  followText: { color: "#fff", fontWeight: "400" },
  avatarImage: {
    width: 25,
    height: 25,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  avatarImageTwo: {
    width: 25,
    height: 25,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    marginLeft: -12,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  iconText: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  liveBadge: {
    backgroundColor: "green",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
    borderRadius: radius.none,
    marginLeft: spacing.sm,
  },
  liveText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "bold",
  },
  liveBanner: {
    backgroundColor: "#00a419b5",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: spacing.base,
    marginRight: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  liveBannerContent: {
    flex: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: "#fff",
    marginRight: spacing.sm,
  },
  liveBannerTitle: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
    marginBottom: spacing.px,
  },
  liveBannerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: fontSize.sm2,
  },
};
