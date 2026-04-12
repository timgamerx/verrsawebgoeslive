// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  toggleBookmark as apiToggleBookmark,
  getUserBookmarks,
} from "../components/api";
// Web storage instead of AsyncStorage
const AsyncStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
  removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
};

export interface Post {
  id: string;
  type: "article" | "video" | "podcast" | "community" | "verse";
  user: string;
  time: string;
  title: string;
  content?: string;
  description?: string;
  image?: string | null;
  image_url?: string; // For verse images
  video?: string;
  is_boosted?: boolean;
  // Add additional fields from the new schema
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  bookmark_count?: number;
  author_id?: string;
  user_id?: string;
  created_by?: string;
  // Community specific fields
  name?: string;
  rules?: string;
  category?: string;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  is_private?: boolean;
  created_at?: string;
  // Podcast specific fields
  username?: string;
  is_verified?: boolean;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
  // Podcast episode fields
  audio_url?: string;
  audio_urls?: string[];
  durations?: number[];
  episode_count?: number;
  duration?: number;
  tags?: string[];
  published?: boolean;
}

interface BookmarkContextType {
  bookmarkedPosts: Post[];
  isBookmarked: (postId: string) => boolean;
  toggleBookmark: (post: Post) => Promise<void>;
  clearAllBookmarks: () => Promise<void>;
  loading: boolean;
  refreshBookmarks: () => Promise<void>;
  initializeBookmarks: () => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined,
);

import { supabase } from '../components/supabase';

const BOOKMARKS_STORAGE_KEY_PREFIX = "@bookmarked_posts_";

// Function to load bookmarks directly from Supabase bookmarks table
const loadBookmarksFromDatabase = async (userId: string): Promise<Post[]> => {
  try {
    // Get bookmarks from the bookmarks table
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from("bookmarks")
      .select("content_id, content_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (bookmarksError) {
      return [];
    }

    if (!bookmarks || bookmarks.length === 0) {
      return [];
    }

    const posts: Post[] = [];

    // Process each bookmark
    for (const bookmark of bookmarks) {
      try {
        let contentData: any = null;

        // Query the appropriate table based on content_type
        switch (bookmark.content_type) {
          case "article":
            const { data: article } = await supabase
              .from("articles")
              .select(
                `
                *,
                profiles:author_id(
                  full_name,
                  username,
                  avatar_url,
                  is_verified,
                  early_creator_program_until
                )
              `,
              )
              .eq("id", bookmark.content_id)
              .single();
            contentData = article;
            break;

          case "podcast":
            const { data: podcast } = await supabase
              .from("podcasts")
              .select(
                `
                *,
                profiles:author_id(full_name, username, avatar_url, is_verified)
              `,
              )
              .eq("id", bookmark.content_id)
              .single();
            contentData = podcast;
            break;

          case "video":
            const { data: video } = await supabase
              .from("videos")
              .select(
                `
                *,
                profiles:user_id(
                  full_name,
                  username,
                  avatar_url,
                  is_verified,
                  early_creator_program_until
                )
              `,
              )
              .eq("id", bookmark.content_id)
              .single();
            contentData = video;
            break;

          case "community":
            const { data: community } = await supabase
              .from("communities")
              .select(
                "id, name, description, created_at, creator_id, member_count, post_count, category, banner_url, icon_url, is_private",
              )
              .eq("id", bookmark.content_id)
              .single();
            contentData = community;
            break;

          case "verse":
            const { data: verse } = await supabase
              .from("posts")
              .select(
                `
                id, content, image_url, user_id, created_at,
                view_count, like_count, comment_count, is_boosted,
                profiles:user_id(
                  full_name,
                  username,
                  avatar_url,
                  is_verified,
                  early_creator_program_until
                )
              `,
              )
              .eq("id", bookmark.content_id)
              .eq("post_type", "verse")
              .single();
            contentData = verse;
            break;
        }

        if (contentData) {
          const post: Post = {
            id: (contentData as any).id,
            type: bookmark.content_type as
              | "article"
              | "video"
              | "podcast"
              | "community"
              | "verse",
            title:
              (contentData as any).title ||
              (contentData as any).name ||
              (bookmark.content_type === "verse" ? "Verse" : ""),
            content:
              (contentData as any).content ||
              (contentData as any).description ||
              "",
            description: (contentData as any).description || "",
            image:
              (contentData as any).image_url ||
              (contentData as any).cover_image_url ||
              (contentData as any).thumbnail_url ||
              null,
            video: (contentData as any).video_url || "",
            user:
              (contentData as any).profiles?.full_name ||
              (contentData as any).profiles?.username ||
              (contentData as any).username ||
              "Unknown",
            time: (contentData as any).created_at || bookmark.created_at,
            view_count: (contentData as any).view_count || 0,
            like_count: (contentData as any).like_count || 0,
            comment_count: (contentData as any).comment_count || 0,
            share_count: (contentData as any).share_count || 0,
            bookmark_count: (contentData as any).bookmark_count || 0,
            author_id:
              (contentData as any).author_id ||
              (contentData as any).user_id ||
              (contentData as any).created_by,
            user_id:
              (contentData as any).user_id || (contentData as any).created_by,
            created_by:
              (contentData as any).created_by || (contentData as any).user_id,
            username:
              (contentData as any).profiles?.username ||
              (contentData as any).username,
            is_verified:
              (contentData as any).profiles?.is_verified ||
              (contentData as any).is_verified ||
              false,
            profiles: (contentData as any).profiles,
            // Community specific
            name: (contentData as any).name,
            rules: (contentData as any).rules,
            category: (contentData as any).category,
            cover_image_url: (contentData as any).cover_image_url,
            avatar_url:
              (contentData as any).avatar_url ||
              (contentData as any).profiles?.avatar_url,
            is_private: (contentData as any).is_private,
            created_at: (contentData as any).created_at,
            // Podcast episode fields
            audio_url: (contentData as any).audio_url,
            audio_urls: (contentData as any).audio_urls,
            durations: (contentData as any).durations,
            episode_count: (contentData as any).episode_count,
            duration: (contentData as any).duration,
            tags: (contentData as any).tags,
            published: (contentData as any).published,
          };

          posts.push(post);
        }
      } catch (error) {
        // Continue with next bookmark instead of failing completely
      }
    }

    return posts;
  } catch (error) {
    return [];
  }
};

interface BookmarkProviderProps {
  children: ReactNode;
}

export const BookmarkProvider: React.FC<BookmarkProviderProps> = ({
  children,
}) => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Get current user ID from Supabase
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      return null;
    }
  };

  // Load bookmarks from database and sync with local storage
  const loadBookmarks = async () => {
    setLoading(true);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setBookmarkedPosts([]);
        setLoading(false);
        return;
      }

      // Get bookmarks directly from database using the new function
      const dbBookmarks = await loadBookmarksFromDatabase(userId);

      // The new function already returns properly formatted Post objects
      const formattedBookmarks: Post[] = dbBookmarks;

      setBookmarkedPosts(formattedBookmarks);

      // Also save to local storage as backup
      await saveBookmarksForCurrentUser(formattedBookmarks);
    } catch (error) {
      // Fallback to local storage if database fails
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const key = `${BOOKMARKS_STORAGE_KEY_PREFIX}${userId}`;
          const localBookmarks = await AsyncStorage.getItem(key);
          if (localBookmarks) {
            const parsedBookmarks = JSON.parse(localBookmarks);
            setBookmarkedPosts(parsedBookmarks);
          } else {
            setBookmarkedPosts([]);
          }
        } else {
          setBookmarkedPosts([]);
        }
      } catch (localError) {
        setBookmarkedPosts([]);
      }
    } finally {
      // Always ensure loading is set to false
      setLoading(false);
    }
  };

  // Listen for auth state changes to refresh bookmarks when user logs in
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // User just signed in, load bookmarks in background after navigation
          setTimeout(async () => {
            try {
              await loadBookmarks();
            } catch (error) {
              // Silent fail
            }
          }, 2000);
        } else if (event === "SIGNED_OUT") {
          // User signed out, clear bookmarks
          setBookmarkedPosts([]);
          setLoading(false);
        }
      },
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const saveBookmarksForCurrentUser = async (bookmarks: Post[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const key = `${BOOKMARKS_STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(bookmarks));
    } catch (error) {}
  };

  const isBookmarked = (postId: string): boolean => {
    return bookmarkedPosts.some((post) => post.id === postId);
  };

  const toggleBookmark = async (post: Post) => {
    try {
      const wasBookmarked = isBookmarked(post.id);

      // Optimistic update - update UI immediately
      let updatedBookmarks: Post[];
      if (wasBookmarked) {
        updatedBookmarks = bookmarkedPosts.filter((p) => p.id !== post.id);
      } else {
        updatedBookmarks = [...bookmarkedPosts, post];
      }

      setBookmarkedPosts(updatedBookmarks);

      // Call API to update database
      const isNowBookmarked = await apiToggleBookmark(post.id, post.type);

      // If the API result doesn't match our optimistic update, correct it
      if (isNowBookmarked !== !wasBookmarked) {
        if (isNowBookmarked) {
          setBookmarkedPosts((prev) => {
            const exists = prev.some((p) => p.id === post.id);
            return exists ? prev : [...prev, post];
          });
        } else {
          setBookmarkedPosts((prev) => prev.filter((p) => p.id !== post.id));
        }
      }

      // Update local storage
      const currentBookmarks = isNowBookmarked
        ? bookmarkedPosts.filter((p) => p.id !== post.id).concat(post)
        : bookmarkedPosts.filter((p) => p.id !== post.id);

      await saveBookmarksForCurrentUser(currentBookmarks);
    } catch (error) {
      // Revert optimistic update on error
      await loadBookmarks();
    }
  };

  const clearAllBookmarks = async () => {
    try {
      // Clear from local state
      setBookmarkedPosts([]);
      await saveBookmarksForCurrentUser([]);

      // Note: We don't clear from database here as user might want to keep them
      // This function mainly clears the local cache
    } catch (error) {}
  };

  // Refresh bookmarks from database
  const refreshBookmarks = async () => {
    try {
      setLoading(true);
      await loadBookmarks();
    } catch (error) {
      setLoading(false);
    }
  };

  // Initialize bookmarks when needed (called by Bookmarks)
  const initializeBookmarks = async () => {
    if (bookmarkedPosts.length === 0 && !loading) {
      await loadBookmarks();
    }
  };

  const value: BookmarkContextType = {
    bookmarkedPosts,
    isBookmarked,
    toggleBookmark,
    clearAllBookmarks,
    loading,
    refreshBookmarks,
    initializeBookmarks,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = (): BookmarkContextType => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
};
