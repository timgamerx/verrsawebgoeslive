/**
 * api.ts — Verrsa Web API layer
 *
 * All data fetching and mutations go through Supabase (protected by RLS).
 * Server-side operations (push notifications, email) are delegated to
 * Supabase Edge Functions via notificationService — no secrets in this file.
 */

import { supabase } from './supabase';
import { getActiveModerationExclusions } from '../lib/moderationExclusions';
import { notificationService } from '../lib/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  content_id: string;
  content_type: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    subscription_status?: string;
    early_creator_program_until?: string;
  };
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  user_id: string;
  published: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  reading_time?: number;
  is_boosted?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; username: string; avatar_url?: string; is_verified?: boolean; subscription_status?: string; early_creator_program_until?: string };
  type?: 'article';
}

export interface Podcast {
  id: string;
  title: string;
  description?: string;
  audio_url: string;
  cover_image_url?: string;
  duration?: number;
  category?: string;
  tags?: string[];
  author_id: string;
  published: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_boosted?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; username: string; avatar_url?: string; is_verified?: boolean; subscription_status?: string; early_creator_program_until?: string };
  type?: 'podcast';
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  category?: string;
  tags?: string[];
  user_id: string;
  author_id?: string;
  published?: boolean;
  view_count?: number;
  like_count?: number;
  is_boosted?: boolean;
  comment_count?: number;
  created_at: string;
  updated_at?: string;
  profiles?: { full_name: string; username: string; avatar_url?: string; is_verified?: boolean; subscription_status?: string; early_creator_program_until?: string };
  type?: 'video';
}

export interface Verse {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  is_boosted?: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; username: string; avatar_url?: string; is_verified?: boolean; subscription_status?: string; early_creator_program_until?: string };
  type?: 'verse';
  title?: string;
}

const normalizeModerationType = (type?: string): string => {
  const t = String(type || '').toLowerCase();
  if (t === 'reel' || t === 'reels' || t === 'reelvideo') return 'video';
  return t;
};

const getModerationTypeVariants = (type?: string): string[] => {
  const raw = String(type || '').toLowerCase();
  const normalized = normalizeModerationType(raw);
  if (normalized === 'video') {
    return [raw, 'video', 'reel', 'reels', 'reelvideo'].filter(Boolean);
  }
  return [raw, normalized].filter(Boolean);
};

const isExcludedItem = (
  item: { id?: string; post_type?: string; user_id?: string },
  fallbackType: string,
  excludedPostKeys: Set<string>,
  excludedUserIds: Set<string>,
): boolean => {
  const userId = String(item.user_id || '');
  if (userId && excludedUserIds.has(userId)) {
    return true;
  }

  const id = String(item.id || '');
  if (!id) return false;

  const type = item.post_type || fallbackType;
  const variants = getModerationTypeVariants(type);
  return variants.some((variant) => excludedPostKeys.has(`${id}_${variant}`));
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export const getArticles = async (limit = 10, offset = 0): Promise<Article[]> => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .eq('post_type', 'article')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('Error fetching articles:', error); return []; }

    return (data || []).filter((item: any) =>
      !isExcludedItem(item, 'article', excludedPostKeys, excludedUserIds)
    );
  } catch (error) {
    console.error('Error in getArticles:', error);
    return [];
  }
};

export const createArticle = async (articleData: {
  title: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  reading_time?: number;
}): Promise<Article | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id, username: user.email?.split('@')[0] || 'user',
        email: user.email || '', full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null, bio: '',
        is_verified: false, subscription_plan: 'free',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...articleData, post_type: 'article', user_id: user.id, published: true }])
      .select().single();

    if (error) throw error;

    if (data) {
      const { data: creatorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
      notificationService.notifyNewPost(creatorProfile?.full_name || 'A creator', 'article', articleData.title, data.id).catch(console.error);
    }

    return data;
  } catch (error) {
    console.error('Error creating article:', error);
    return null;
  }
};

// ─── Podcasts ─────────────────────────────────────────────────────────────────

export const getPodcasts = async (limit = 10, offset = 0): Promise<Podcast[]> => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .eq('post_type', 'podcast')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('Error fetching podcasts:', error); return []; }

    return (data || []).filter((item: any) =>
      !isExcludedItem(item, 'podcast', excludedPostKeys, excludedUserIds)
    );
  } catch (error) {
    console.error('Error in getPodcasts:', error);
    return [];
  }
};

export const createPodcast = async (podcastData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...podcastData, post_type: 'podcast', user_id: podcastData.author_id || user.id, published: true }])
      .select().single();

    if (error) throw error;

    if (data) {
      const { data: creatorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', data.user_id).single();
      notificationService.notifyNewPost(creatorProfile?.full_name || 'A creator', 'podcast', podcastData.title || 'New Podcast', data.id).catch(console.error);
    }

    return data;
  } catch (error) {
    console.error('Error creating podcast:', error);
    return null;
  }
};

// ─── Videos ───────────────────────────────────────────────────────────────────

export const getVideos = async (limit = 10, offset = 0): Promise<Video[]> => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .eq('post_type', 'video')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('Error fetching videos:', error); return []; }

    return (data || []).filter((item: any) =>
      !isExcludedItem(item, 'video', excludedPostKeys, excludedUserIds)
    );
  } catch (error) {
    console.error('Error in getVideos:', error);
    return [];
  }
};

export const getVideoById = async (videoId: string): Promise<Video | null> => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .eq('id', videoId)
      .eq('post_type', 'video')
      .single();

    if (error) { 
      console.error('Error fetching video:', error); 
      return null; 
    }

    if (!data) return null;

    if (isExcludedItem(data, 'video', excludedPostKeys, excludedUserIds)) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getVideoById:', error);
    return null;
  }
};

export const createVideo = async (videoData: {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  category?: string;
  tags?: string[];
}): Promise<Video | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...videoData, post_type: 'video', user_id: user.id, published: true }])
      .select().single();

    if (error) throw error;

    if (data) {
      const { data: creatorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
      notificationService.notifyNewPost(creatorProfile?.full_name || 'A creator', 'video', videoData.title, data.id).catch(console.error);
    }

    return data;
  } catch (error) {
    console.error('Error creating video:', error);
    return null;
  }
};

// ─── All Posts (unified feed) ─────────────────────────────────────────────────

export const getAllPosts = async (limit = 80, offset = 0) => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .in('post_type', ['article', 'podcast', 'video', 'verse'])
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('Error fetching all posts:', error); return []; }

    return (data || [])
      .filter((item: any) =>
        !isExcludedItem(item, String(item.post_type || ''), excludedPostKeys, excludedUserIds)
      )
      .map((item: any) => ({ ...item, type: item.post_type }));
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    return [];
  }
};

// ─── Verses ───────────────────────────────────────────────────────────────────

export const getVerses = async (limit = 10, offset = 0): Promise<Verse[]> => {
  try {
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status)`)
      .eq('post_type', 'verse')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('Error fetching verses:', error); return []; }

    return (data || [])
      .filter((item: any) =>
        !isExcludedItem(item, 'verse', excludedPostKeys, excludedUserIds)
      )
      .map((item: any) => ({ ...item, type: 'verse' as const }));
  } catch (error) {
    console.error('Error in getVerses:', error);
    return [];
  }
};

export const createVerse = async (verseData: { content: string; image_url?: string }): Promise<Verse | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...verseData, post_type: 'verse', user_id: user.id, published: true }])
      .select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating verse:', error);
    return null;
  }
};

// ─── Likes ────────────────────────────────────────────────────────────────────

export const toggleLike = async (
  contentId: string,
  contentType: 'article' | 'podcast' | 'video' | 'community' | 'community_post' | 'verse',
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: userLike } = await supabase.from('likes').select('id')
      .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType).single();

    const hasLiked = !!userLike;

    if (hasLiked) {
      await supabase.from('likes').delete()
        .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType);
    } else {
      const { error: insertError } = await supabase.from('likes').insert([{
        user_id: user.id, content_id: contentId, content_type: contentType,
        created_at: new Date().toISOString(),
      }]);

      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.includes('unique')) return true;
        console.error('Error adding like:', insertError);
        return false;
      }

      // Notify content owner (server-side via Edge Function)
      try {
        const actorName = user.user_metadata?.full_name || 'Someone';
        let contentOwnerId: string | null = null;

        if (contentType === 'community') {
          const { data: c } = await supabase.from('community').select('created_by').eq('id', contentId).single();
          contentOwnerId = c?.created_by;
        } else {
          const { data: p } = await supabase.from('posts').select('user_id').eq('id', contentId).single();
          contentOwnerId = p?.user_id;
        }

        if (contentOwnerId && contentOwnerId !== user.id) {
          await createNotification(contentOwnerId, user.id, 'like', `liked your ${contentType}`, undefined, undefined, actorName, { content_type: contentType, content_id: contentId });
          notificationService.notifyLike(contentOwnerId, actorName, contentType, contentId).catch(console.error);
        }
      } catch (notifErr) {
        console.error('Failed to send like notification:', notifErr);
      }
    }

    return !hasLiked;
  } catch (error) {
    console.error('Error toggling like:', error);
    return false;
  }
};

export const getUserLikeStatus = async (
  contentId: string,
  contentType: 'article' | 'podcast' | 'video' | 'community' | 'community_post' | 'verse',
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase.from('likes').select('id')
      .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType).single();

    return !!data;
  } catch {
    return false;
  }
};

export const getUserLikeStatusBatch = async (
  contentItems: { id: string; type: 'article' | 'podcast' | 'video' | 'community' | 'community_post' | 'verse' }[],
): Promise<Record<string, boolean>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || contentItems.length === 0) return {};

    const contentIds = contentItems.map((item) => item.id);
    const { data: likes } = await supabase.from('likes').select('content_id, content_type')
      .eq('user_id', user.id).in('content_id', contentIds);

    const likeStatus: Record<string, boolean> = {};
    contentItems.forEach((item) => {
      likeStatus[`${item.id}_${item.type}`] = likes?.some(
        (like) => like.content_id === item.id && like.content_type === item.type
      ) || false;
    });

    return likeStatus;
  } catch (error) {
    console.error('Error getting batch like status:', error);
    return {};
  }
};

export const getLikeCount = async (contentId: string, contentType: string): Promise<number> => {
  try {
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true })
      .eq('content_id', contentId).eq('content_type', contentType);
    return count || 0;
  } catch { return 0; }
};

export const getLikeCountsBatch = async (
  contentItems: { id: string; type: 'article' | 'podcast' | 'video' | 'community' | 'community_post' | 'verse' }[],
): Promise<Record<string, number>> => {
  try {
    if (contentItems.length === 0) return {};

    const counts = await Promise.all(
      contentItems.map(async (item) => {
        const count = await getLikeCount(item.id, item.type);
        return [`${item.id}_${item.type}`, count] as const;
      }),
    );

    return Object.fromEntries(counts);
  } catch (error) {
    console.error('Error getting batch like counts:', error);
    return {};
  }
};

// ─── Shares ───────────────────────────────────────────────────────────────────

export const trackShare = async (
  contentId: string,
  contentType: 'article' | 'podcast' | 'video' | 'community' | 'verse',
  shareMethod = 'copy_link',
  platform?: string,
): Promise<boolean> => {
  try {
    if (!contentId || !contentType) return false;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('shares').insert([{
      user_id: user?.id || null, content_id: contentId, content_type: contentType,
      share_method: shareMethod, platform: platform || null,
    }]);

    if (error) {
      if (error.code === '22004') return true;
      console.error('Error tracking share:', error);
      return false;
    }

    if (user) {
      try {
        const actorName = user.user_metadata?.full_name || 'Someone';
        const { data: p } = await supabase.from('posts').select('user_id').eq('id', contentId).single();
        const contentOwnerId = p?.user_id;
        if (contentOwnerId && contentOwnerId !== user.id) {
          notificationService.notifyShare(contentOwnerId, actorName, user.id, contentType, contentId).catch(console.error);
        }
      } catch {}
    }

    return true;
  } catch (error) {
    console.error('Error in trackShare:', error);
    return false;
  }
};

export const getShareCount = async (contentId: string, contentType: string): Promise<number> => {
  try {
    const { count } = await supabase.from('shares').select('*', { count: 'exact', head: true })
      .eq('content_id', contentId).eq('content_type', contentType);
    return count || 0;
  } catch { return 0; }
};

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export const toggleBookmark = async (
  contentId: string,
  contentType: 'article' | 'podcast' | 'video' | 'community' | 'verse',
  notes?: string,
  folder?: string,
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: existing } = await supabase.from('bookmarks').select('id')
      .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType).single();

    if (existing) {
      await supabase.from('bookmarks').delete()
        .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType);
      return false;
    }

    const { error: insertError } = await supabase.from('bookmarks').insert([{
      user_id: user.id, content_id: contentId, content_type: contentType,
      notes: notes || null, folder: folder || null,
    }]);

    if (insertError) { console.error('Error adding bookmark:', insertError); return false; }

    try {
      const saverName = user?.user_metadata?.full_name || 'Someone';
      const { data: p } = await supabase.from('posts').select('user_id').eq('id', contentId).single();
      const contentOwnerId = p?.user_id;
      if (contentOwnerId && contentOwnerId !== user.id) {
        notificationService.notifySave(contentOwnerId, saverName, user.id, contentType, contentId).catch(console.error);
      }
    } catch {}

    return true;
  } catch (error) {
    console.error('Error in toggleBookmark:', error);
    return false;
  }
};

export const getUserBookmarkStatus = async (contentId: string, contentType: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('bookmarks').select('id')
      .eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType).single();
    return !!data;
  } catch { return false; }
};

export const getUserBookmarkStatusBatch = async (
  contentItems: { id: string; type: string }[],
): Promise<Record<string, boolean>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || contentItems.length === 0) return {};

    const { data: bookmarks } = await supabase.from('bookmarks').select('content_id, content_type')
      .eq('user_id', user.id).in('content_id', contentItems.map((i) => i.id));

    const status: Record<string, boolean> = {};
    contentItems.forEach((item) => {
      status[item.id] = bookmarks?.some((b) => b.content_id === item.id && b.content_type === item.type) || false;
    });
    return status;
  } catch { return {}; }
};

export const getUserBookmarks = async (limit = 50, offset = 0): Promise<any[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: allUserBookmarks, error } = await supabase.from('bookmarks').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });

    if (error || !allUserBookmarks?.length) return [];

    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();
    const results: any[] = [];

    for (const bookmark of allUserBookmarks) {
      try {
        let contentData: any = null;

        if (['article', 'podcast', 'video', 'verse'].includes(bookmark.content_type)) {
          const { data } = await supabase.from('posts')
            .select(`id, title, content, excerpt, cover_image_url, user_id, created_at, view_count, like_count, comment_count, is_boosted, profiles:user_id (full_name, username, avatar_url, is_verified)`)
            .eq('id', bookmark.content_id).eq('post_type', bookmark.content_type).single();

          if (data) {
            contentData = {
              ...data,
              type: bookmark.content_type,
              bookmarked_at: bookmark.created_at,
              bookmark_notes: bookmark.notes,
              bookmark_folder: bookmark.folder,
            };
          }
        }

        if (contentData) {
          const ownerId = contentData.user_id;
          const postKey = `${contentData.id}_${contentData.type}`;
          if (excludedUserIds.has(String(ownerId)) || excludedPostKeys.has(postKey)) continue;
          results.push(contentData);
        }
      } catch {}
    }

    return results.sort((a, b) => new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime());
  } catch (error) {
    console.error('Error getting user bookmarks:', error);
    return [];
  }
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const getComments = async (contentId: string, contentType: string): Promise<Comment[]> => {
  try {
    if (!contentId || !contentType) return [];

    const { data, error } = await supabase.from('comments').select('*')
      .eq('content_id', contentId).eq('content_type', contentType)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data?.length) return [];

    const userIds = [...new Set(data.map((c: any) => c.user_id).filter(Boolean))];
    const { data: profiles } = await supabase.from('profiles')
      .select('id, full_name, username, avatar_url, is_verified, subscription_status').in('id', userIds);

    const profileMap: Record<string, any> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

    return data.map((comment: any) => ({ ...comment, profiles: profileMap[comment.user_id] || null }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const createComment = async (contentId: string, contentType: string, comment: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    if (!contentId || !contentType || !comment.trim()) throw new Error('Missing required parameters');

    const { data, error } = await supabase.from('comments').insert([{
      content: comment.trim(), user_id: user.id, content_id: contentId, content_type: contentType,
    }]).select().single();

    if (error) throw error;

    try {
      const actorName = user.user_metadata?.full_name || 'Someone';
      let contentOwner = null;
      let contentTitle = '';

      const { data: post } = await supabase.from('posts').select('user_id, title, content').eq('id', contentId).single();
      if (post) { contentOwner = post.user_id; contentTitle = post.title || post.content?.substring(0, 50) || ''; }

      if (contentOwner && contentOwner !== user.id) {
        await createNotification(contentOwner, user.id, 'comment',
          `commented on your ${contentType}${contentTitle ? `: "${contentTitle}"` : ''}`,
          undefined, undefined, 'New Comment', { comment_content: comment.trim(), content_type: contentType, content_id: contentId });

        notificationService.notifyComment(contentOwner, actorName, user.id, contentType, contentId, comment.trim().substring(0, 50)).catch(console.error);

        // Handle @mentions
        const mentions = comment.match(/@([a-zA-Z0-9_]+)/g);
        if (mentions) {
          for (const mention of mentions) {
            const { data: mentioned } = await supabase.from('profiles').select('id').eq('username', mention.slice(1)).single();
            if (mentioned && mentioned.id !== user.id) {
              notificationService.notifyMention(mentioned.id, actorName, user.id, `${contentType} comment`, contentId).catch(console.error);
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn('Could not create comment notification:', notifErr);
    }

    return data;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

export const createReplyComment = async (
  contentId: string, contentType: string, parentCommentId: string, replyText: string,
) => {
  const marker = `[reply-to:${parentCommentId}] `;
  const result = await createComment(contentId, contentType, marker + replyText);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return result;

    const { data: parentComment } = await supabase.from('comments').select('user_id').eq('id', parentCommentId).single();
    if (parentComment && parentComment.user_id !== user.id) {
      const actorName = user.user_metadata?.full_name || user.user_metadata?.username || 'Someone';
      notificationService.notifyReply(parentComment.user_id, actorName, user.id, contentId, replyText.substring(0, 100)).catch(console.error);
    }
  } catch (error) {
    console.error('Failed to send reply notification:', error);
  }

  return result;
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id);
    if (error) { console.error('Error deleting comment:', error); return false; }
    return true;
  } catch (error) {
    console.error('Error in deleteComment:', error);
    return false;
  }
};

export const toggleCommentLike = async (commentId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: existing } = await supabase.from('comment_likes').select('id')
      .eq('user_id', user.id).eq('comment_id', commentId).single();

    if (existing) {
      await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
      return false;
    }

    const { error } = await supabase.from('comment_likes').insert([{ user_id: user.id, comment_id: commentId }]);
    if (error) {
      if (error.code === '23505' || error.message?.includes('unique')) return true;
      console.error('Error adding comment like:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in toggleCommentLike:', error);
    return false;
  }
};

export const getCommentLikeStatus = async (commentId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('comment_likes').select('id').eq('user_id', user.id).eq('comment_id', commentId).single();
    return !!data;
  } catch { return false; }
};

// ─── User Posts ───────────────────────────────────────────────────────────────

export const getUserArticles = async (userId: string): Promise<Article[]> => {
  try {
    const { data, error } = await supabase.from('posts').select('*').eq('post_type', 'article').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching user articles:', error); return []; }
    const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', userId).single();
    return (data || []).map((a) => ({ ...a, type: 'article' as const, profiles: profile || undefined }));
  } catch (error) { console.error('Error in getUserArticles:', error); return []; }
};

export const getUserPodcasts = async (userId: string): Promise<Podcast[]> => {
  try {
    const { data, error } = await supabase.from('posts').select('*').eq('post_type', 'podcast').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching user podcasts:', error); return []; }
    const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', userId).single();
    return (data || []).map((p) => ({ ...p, type: 'podcast' as const, profiles: profile || undefined }));
  } catch (error) { console.error('Error in getUserPodcasts:', error); return []; }
};

export const getUserVideos = async (userId: string): Promise<Video[]> => {
  try {
    const { data, error } = await supabase.from('posts').select('*').eq('post_type', 'video').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching user videos:', error); return []; }
    const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', userId).single();
    return (data || []).map((v) => ({ ...v, type: 'video' as const, profiles: profile || undefined }));
  } catch (error) { console.error('Error in getUserVideos:', error); return []; }
};

export const getUserVerses = async (userId: string): Promise<Verse[]> => {
  try {
    const { data, error } = await supabase.from('posts').select('*').eq('post_type', 'verse').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching user verses:', error); return []; }
    const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', userId).single();

    const verseIds = (data || []).map((v) => v.id);
    let commentCountMap: Record<string, number> = {};
    if (verseIds.length > 0) {
      const { data: commentRows } = await supabase.from('verse_comments').select('verse_id').in('verse_id', verseIds);
      (commentRows || []).forEach((row: any) => { commentCountMap[row.verse_id] = (commentCountMap[row.verse_id] || 0) + 1; });
    }

    return (data || []).map((v) => ({
      ...v, type: 'verse' as const, profiles: profile || undefined,
      title: v.content?.substring(0, 50) || 'Verse',
      comment_count: commentCountMap[v.id] ?? v.comment_count ?? 0,
    }));
  } catch (error) { console.error('Error in getUserVerses:', error); return []; }
};

export const getUserAllPosts = async (userId: string): Promise<(Article | Podcast | Video | Verse)[]> => {
  try {
    const { data: posts, error } = await supabase.from('posts')
      .select(`*, profiles:user_id (full_name, username, avatar_url, is_verified, subscription_status, early_creator_program_until)`)
      .eq('user_id', userId).in('post_type', ['article', 'podcast', 'video', 'verse'])
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching user posts:', error); return []; }

    const verseIds = (posts || []).filter((p) => p.post_type === 'verse').map((v) => v.id);
    let commentCountMap: Record<string, number> = {};
    if (verseIds.length > 0) {
      const { data: commentRows } = await supabase.from('verse_comments').select('verse_id').in('verse_id', verseIds);
      (commentRows || []).forEach((row: any) => { commentCountMap[row.verse_id] = (commentCountMap[row.verse_id] || 0) + 1; });
    }

    return (posts || []).map((post) => {
      const base = { ...post, type: post.post_type as any };
      if (post.post_type === 'verse') {
        return { ...base, title: post.content?.substring(0, 50) || 'Verse', comment_count: commentCountMap[post.id] ?? post.comment_count ?? 0 };
      }
      return base;
    });
  } catch (error) {
    console.error('Error in getUserAllPosts:', error);
    return [];
  }
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const getUserProfile = async (userId?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('No user ID provided');

    const { data, error } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (updates: {
  full_name?: string; username?: string; bio?: string; avatar_url?: string;
  website?: string; location?: string; skills?: string[];
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase.from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = async (limit = 50, offset = 0) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: notifications, error } = await supabase.from('notifications')
      .select('id, user_id, actor_id, type, post_id, community_id, message, is_read, created_at, meta, title')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !notifications?.length) return notifications ? [] : [];

    const actorIds = [...new Set(notifications.map((n: any) => n.actor_id).filter(Boolean))];
    let profileMap = new Map();

    if (actorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, username, avatar_url, is_verified').in('id', actorIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    }

    return notifications.map((n: any) => ({
      ...n, actor_profile: n.actor_id ? profileMap.get(n.actor_id) : undefined,
    }));
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    return !error;
  } catch { return false; }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    return !error;
  } catch { return false; }
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    return count || 0;
  } catch { return 0; }
};

export const createNotification = async (
  userId: string, actorId: string, type: string, message: string,
  postId?: string, communityId?: string, title?: string, meta?: any,
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('notifications').insert([{
      user_id: userId, actor_id: actorId, type, message,
      post_id: postId || null, community_id: communityId || null,
      title, meta, is_read: false,
    }]).select();

    if (error) { console.error('Error creating notification:', error); return false; }
    return true;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return false;
  }
};

export const notifyFollowersOfNewPost = async (
  authorId: string,
  contentType: 'article' | 'podcast' | 'video' | 'verse',
  contentId: string,
  contentTitle: string,
): Promise<boolean> => {
  try {
    const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', authorId);
    if (!followers?.length) return true;

    const { data: authorProfile } = await supabase.from('profiles').select('full_name, username').eq('id', authorId).single();
    const authorName = authorProfile?.full_name || authorProfile?.username || 'A creator';

    const notifications = followers.map((f: any) => ({
      user_id: f.follower_id, actor_id: authorId, type: 'new_post',
      message: `${authorName} posted a new ${contentType}: "${contentTitle}"`,
      post_id: contentId, is_read: false,
    }));

    const batchSize = 100;
    for (let i = 0; i < notifications.length; i += batchSize) {
      await supabase.from('notifications').insert(notifications.slice(i, i + batchSize));
    }

    notificationService.notifyNewPost(authorName, contentType, contentTitle, contentId).catch(console.error);
    return true;
  } catch (error) {
    console.error('Error in notifyFollowersOfNewPost:', error);
    return false;
  }
};

// ─── View Tracking ────────────────────────────────────────────────────────────

export const incrementViewCount = async (tableName: string, rowId: string): Promise<boolean> => {
  try {
    const { error: rpcErr } = await supabase.rpc('increment_view_count', { table_name: tableName, row_id: rowId } as any);
    if (!rpcErr) return true;

    const { data: current } = await supabase.from(tableName).select('view_count').eq('id', rowId).single();
    const next = (current?.view_count || 0) + 1;
    const { error } = await supabase.from(tableName).update({ view_count: next }).eq('id', rowId);
    return !error;
  } catch (err) {
    console.error('Error incrementing view_count', err);
    return false;
  }
};

export const trackView = async (
  contentId: string,
  contentType: 'article' | 'podcast' | 'video' | 'community' | 'verse',
  duration?: number,
  deviceType?: string,
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('views').insert([{
      user_id: user?.id || null, content_id: contentId, content_type: contentType,
      duration: duration || null, device_type: deviceType || null,
    }]);

    const tableName = ['article', 'podcast', 'video', 'verse'].includes(contentType) ? 'posts' : 'community';
    return await incrementViewCount(tableName, contentId);
  } catch (error) {
    console.error('Error in trackView:', error);
    return false;
  }
};

export const updateVideoWatchTime = async (videoId: string, additionalSeconds: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_watch_time', { video_id: videoId, seconds: additionalSeconds });
    return !error;
  } catch { return false; }
};

export const updatePodcastListenTime = async (podcastId: string, additionalSeconds: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_listen_time', { podcast_id: podcastId, seconds: additionalSeconds });
    return !error;
  } catch { return false; }
};

// ─── Notification Formatting ──────────────────────────────────────────────────

const getDotColor = (type: string): string => {
  const colors: Record<string, string> = {
    like: '#d73c3c', share: '#6a0dad', comment: '#f39c12', payment: '#2ecc71',
    community: '#ff4500', engagement: '#1e90ff', mention: '#1e90ff',
    monetization: '#ff69b4', follow: '#8a2be2', chat: '#32cd32',
  };
  return colors[type] || '#666666';
};

export const formatNotificationForUI = (notification: any) => {
  const date = new Date(notification.created_at);
  return {
    id: notification.id,
    type: notification.type,
    user: notification.actor_profile?.full_name || notification.actor_profile?.username || notification.actor_id || undefined,
    message: notification.message,
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    dotColor: getDotColor(notification.type),
    isRead: notification.is_read,
    post_id: notification.post_id,
    community_id: notification.community_id,
    actor_id: notification.actor_id,
    title: notification.title,
    meta: notification.meta,
  };
};

// ─── Boost / Promoted Posts ───────────────────────────────────────────────────

export const getActivePromotedPosts = async (): Promise<{ postId: string; postType: string }[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('promoted_posts')
      .select('post_id, post_type').eq('status', 'active').eq('payment_status', 'paid')
      .lte('start_date', now).gt('end_date', now);

    if (error) { console.error('Error fetching active promoted posts:', error); return []; }
    return (data || []).map((item: any) => ({ postId: item.post_id, postType: item.post_type }));
  } catch (error) {
    console.error('Error in getActivePromotedPosts:', error);
    return [];
  }
};

export const isPostPromoted = async (postId: string, postType: string): Promise<boolean> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('promoted_posts').select('id')
      .eq('post_id', postId).eq('post_type', postType).eq('status', 'active')
      .lte('start_date', now).gte('end_date', now).single();

    if (error && error.code !== 'PGRST116') return false;
    return !!data;
  } catch { return false; }
};

export const getPriceForDuration = async (days: number): Promise<number> => {
  const value = Number(days || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;

  // Web migration fallback pricing model.
  return Math.max(5, Math.round(value * 1.5));
};

export const createPromotedPost = async (campaignData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase.from('promoted_posts').insert([{
      user_id: user.id, ...campaignData, status: 'pending', payment_status: 'pending',
    }]).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating promoted post:', error);
    return null;
  }
};

export const updatePromotedPostPayment = async (promotedPostId: string, paymentData: any): Promise<boolean> => {
  try {
    const { data: promotedPost, error: fetchError } = await supabase.from('promoted_posts')
      .select('duration_days').eq('id', promotedPostId).single();

    if (fetchError || !promotedPost) return false;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + promotedPost.duration_days);

    const { error } = await supabase.from('promoted_posts').update({
      payment_status: 'paid',
      payment_reference: paymentData.reference,
      paystack_reference: paymentData.paystack_reference,
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    }).eq('id', promotedPostId);

    return !error;
  } catch (error) {
    console.error('Error in updatePromotedPostPayment:', error);
    return false;
  }
};

export const getUserPromotedPosts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('promoted_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return error ? [] : (data || []);
  } catch { return []; }
};

export const cancelPromotedPost = async (promotedPostId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('promoted_posts').update({ status: 'cancelled', end_date: new Date().toISOString() }).eq('id', promotedPostId);
    return !error;
  } catch { return false; }
};
