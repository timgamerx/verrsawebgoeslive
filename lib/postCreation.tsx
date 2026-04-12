/**
 * postCreation.ts
 *
 * All Supabase save-to-posts logic extracted from:
 *   - screens/WriteArticle.tsx  (createArticle)
 *   - screens/CreatePodcast.tsx (createPodcast)
 *   - screens/PostVideo.tsx     (saveVideoToDatabase)
 *   - screens/CreateVerse.tsx   (createVerse)
 *
 * Import `supabase` from your own supabase client setup.
 * These are pure async functions with no React Native / Expo dependencies —
 * safe to use directly in a React web project.
 */


import { supabase } from '../components/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload any file (image, audio, video) to Supabase Storage and return its
 * public URL.  Pass `bucket: "media-private"` for gated content — the caller
 * is then responsible for generating signed URLs at read-time.
 *
 * @param file        A File / Blob object (web) or an object with a `uri`
 *                    pointing to a local file (React Native / Expo kept for
 *                    reference — on web just pass a real File).
 * @param filePath    Storage path, e.g. "covers/userId/timestamp-cover.jpg"
 * @param contentType MIME type, e.g. "image/jpeg"
 * @param bucket      Supabase storage bucket name (default: "media-public")
 * @returns           Public URL string, or null on failure
 */
export async function uploadFileToStorage(
  file: File | Blob,
  filePath: string,
  contentType: string,
  bucket: "media-public" | "media-private" = "media-public",
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { contentType, upsert: true });

  if (error || !data) {
    console.error("Storage upload error:", error);
    return null;
  }

  if (bucket === "media-private") {
    // Return the raw storage path; caller must create a signed URL to read it.
    return data.path;
  }

  const { data: urlData } = supabase.storage
    .from("media-public")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Create a 1-hour signed URL for a file stored in media-private.
 */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("media-private")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENSURE PROFILE EXISTS (used by createArticle — safe to skip in web if
// profiles are created on sign-up)
// ─────────────────────────────────────────────────────────────────────────────

async function ensureProfile(userId: string, email: string | undefined, metadata: Record<string, any>) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    const defaultProfile = {
      id: userId,
      username: email?.split("@")[0] || "user",
      email: email || "",
      first_name: metadata?.first_name || "",
      last_name: metadata?.last_name || "",
      full_name: metadata?.full_name || "",
      avatar_url: metadata?.avatar_url || null,
      bio: "",
      is_verified: false,
      subscription_plan: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("profiles").upsert(defaultProfile);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ARTICLE
// ─────────────────────────────────────────────────────────────────────────────

export interface ArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  /** Public URL from uploadFileToStorage() */
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  /** Estimated reading time in minutes */
  reading_time?: number;
}

/**
 * Insert a new article into the `posts` table.
 *
 * Equivalent to `createArticle()` in lib/api.ts.
 * Automatically sets `post_type: "article"` and `published: true`.
 *
 * @returns The newly created post row, or null on failure.
 */
export async function createArticle(input: ArticleInput): Promise<any | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  await ensureProfile(user.id, user.email, user.user_metadata);

  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        ...input,
        post_type: "article",
        user_id: user.id,
        published: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PODCAST
// ─────────────────────────────────────────────────────────────────────────────

export interface PodcastInput {
  title: string;
  description: string;
  /** Array of public audio URLs — one per episode */
  audio_urls: string[];
  /** Duration in seconds for each episode, parallel array to audio_urls */
  durations: number[];
  episode_count: number;
  /** Public URL of cover image */
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  /** user_id is set automatically from the session */
  author_id: string;
  published: true;
}

/**
 * Insert a new podcast post into the `posts` table.
 *
 * Equivalent to `createPodcast()` inside screens/CreatePodcast.tsx.
 * Automatically sets `post_type: "podcast"`.
 *
 * @returns The newly created post row, or null on failure.
 */
export async function createPodcast(input: PodcastInput): Promise<any | null> {
  const { data, error } = await supabase
    .from("posts")
    .insert([{ ...input, post_type: "podcast" }])
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating podcast:", error);
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VIDEO
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoPostInput {
  /** UUID — generate with `crypto.randomUUID()` on web */
  id: string;
  title: string;
  /** Public URL of uploaded video */
  videoUrl: string;
  /** Public URL of thumbnail image (optional) */
  thumbnailUrl?: string;
  /** Duration in seconds (optional, defaults to 0) */
  duration?: number;
  userId: string;
  username: string;
  userAvatar?: string;
  timestamp: string;
  /** Pixel width — use 1080 as default */
  width?: number;
  /** Pixel height — use 1920 as default */
  height?: number;
}

/**
 * Insert a new video post into the `posts` table.
 *
 * Equivalent to `saveVideoToDatabase()` in screens/PostVideo.tsx.
 * Automatically sets `post_type: "video"` and `published: true`.
 *
 * @returns The inserted row array from Supabase, or throws on error.
 */
export async function saveVideoToDatabase(videoPost: VideoPostInput): Promise<any> {
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        id: videoPost.id,
        post_type: "video",
        title: videoPost.title,
        video_url: videoPost.videoUrl,
        thumbnail_url: videoPost.thumbnailUrl,
        duration: Math.round(videoPost.duration ?? 0),
        user_id: videoPost.userId,
        username: videoPost.username,
        user_avatar: videoPost.userAvatar,
        created_at: videoPost.timestamp,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        view_count: 0,
        width: videoPost.width ?? 1080,
        height: videoPost.height ?? 1920,
        published: true,
      },
    ])
    .select();

  if (error) {
    console.error("Database error saving video:", error);
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERSE
// ─────────────────────────────────────────────────────────────────────────────

export interface VerseInput {
  content: string;
  /** Public URL of optional verse image */
  image_url?: string | null;
}

/**
 * Insert a new verse post into the `posts` table.
 *
 * Equivalent to the Supabase call inside `publishVerse()` in
 * screens/CreateVerse.tsx.
 * Automatically sets `post_type: "verse"` and `user_id` from the session.
 *
 * @returns The newly created post row, or throws on error.
 */
export async function createVerse(input: VerseInput): Promise<any> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      post_type: "verse",
      user_id: user.id,
      content: input.content.trim(),
      image_url: input.image_url ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTS TABLE SCHEMA REFERENCE
// ─────────────────────────────────────────────────────────────────────────────
// Column              | Used by
// --------------------|--------------------------------------------------
// id                  | all (auto UUID unless supplied)
// post_type           | "article" | "podcast" | "video" | "verse"
// user_id             | all
// title               | article, podcast, video
// content             | article, verse
// excerpt             | article
// cover_image_url     | article, podcast
// category            | article, podcast
// tags                | article, podcast  (text[])
// reading_time        | article
// audio_urls          | podcast           (text[])
// durations           | podcast           (int[])
// episode_count       | podcast
// author_id           | podcast
// video_url           | video
// thumbnail_url       | video
// duration            | video
// username            | video
// user_avatar         | video
// width / height      | video
// image_url           | verse
// published           | all
// like_count          | video (others default 0 via DB)
// comment_count       | video (others default 0 via DB)
// share_count         | video
// view_count          | video
// created_at          | all (auto by DB unless supplied)
