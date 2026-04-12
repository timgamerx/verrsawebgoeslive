import { supabase } from "../components/supabase";

/**
 * Tracks video watch engagement for a user
 * NEW EARNINGS MODEL: Users must watch at least 50% of video duration
 * Each qualifying user who reaches 50% threshold = 1 count
 * @param userId - The user watching the video
 * @param videoId - The video being watched
 * @param creatorId - The creator of the video
 * @param durationMinutes - How long the user watched in minutes
 * @param videoDurationMinutes - Total duration of the video in minutes
 */
export async function trackVideoWatch(
  userId: string,
  videoId: string,
  creatorId: string,
  durationMinutes: number,
  videoDurationMinutes?: number,
) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // If video duration not provided, fetch it from database
    let totalDuration = videoDurationMinutes;
    if (!totalDuration) {
      const { data: videoData } = await supabase
        .from("videos")
        .select("video_duration")
        .eq("id", videoId)
        .single();
      
      if (videoData?.video_duration) {
        // Convert milliseconds to minutes
        totalDuration = videoData.video_duration / 60000;
      }
    }

    // Try to update existing record for today, or insert new one
    const { data: existing } = await supabase
      .from("user_video_views")
      .select("id, watch_duration_minutes, video_duration_minutes")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)
      .single();

    if (existing) {
      // Update existing record - add to duration
      await supabase
        .from("user_video_views")
        .update({
          watch_duration_minutes:
            existing.watch_duration_minutes + durationMinutes,
          video_duration_minutes: totalDuration || existing.video_duration_minutes,
        })
        .eq("id", existing.id);
    } else {
      // Insert new record
      await supabase.from("user_video_views").insert({
        user_id: userId,
        video_id: videoId,
        creator_id: creatorId,
        watch_duration_minutes: durationMinutes,
        video_duration_minutes: totalDuration || 0,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking video watch:", error);
    return { success: false, error };
  }
}

/**
 * Tracks podcast listen engagement for a user
 * NEW EARNINGS MODEL: Users must listen to at least 50% of podcast duration
 * Each qualifying user who reaches 50% threshold = 1 count
 * @param userId - The user listening to the podcast
 * @param podcastId - The podcast being listened to
 * @param creatorId - The creator of the podcast
 * @param durationMinutes - How long the user listened in minutes
 * @param podcastDurationMinutes - Total duration of the podcast episode in minutes
 */
export async function trackPodcastListen(
  userId: string,
  podcastId: string,
  creatorId: string,
  durationMinutes: number,
  podcastDurationMinutes?: number,
) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // If podcast duration not provided, fetch it from database
    let totalDuration = podcastDurationMinutes;
    if (!totalDuration) {
      const { data: podcastData } = await supabase
        .from("podcasts")
        .select("durations")
        .eq("id", podcastId)
        .single();
      
      if (podcastData?.durations && Array.isArray(podcastData.durations)) {
        // Use first episode duration, convert seconds to minutes
        totalDuration = (podcastData.durations[0] || 0) / 60;
      }
    }

    // Try to update existing record for today, or insert new one
    const { data: existing } = await supabase
      .from("user_podcast_listens")
      .select("id, listen_duration_minutes, podcast_duration_minutes")
      .eq("user_id", userId)
      .eq("podcast_id", podcastId)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)
      .single();

    if (existing) {
      // Update existing record - add to duration
      await supabase
        .from("user_podcast_listens")
        .update({
          listen_duration_minutes:
            existing.listen_duration_minutes + durationMinutes,
          podcast_duration_minutes: totalDuration || existing.podcast_duration_minutes,
        })
        .eq("id", existing.id);
    } else {
      // Insert new record
      await supabase.from("user_podcast_listens").insert({
        user_id: userId,
        podcast_id: podcastId,
        creator_id: creatorId,
        listen_duration_minutes: durationMinutes,
        podcast_duration_minutes: totalDuration || 0,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking podcast listen:", error);
    return { success: false, error };
  }
}

/**
 * Tracks article read engagement for a user
 * NEW EARNINGS MODEL: Users must read for at least 50% of estimated reading time
 * Each qualifying user who reaches 50% threshold = 1 count
 * @param userId - The user reading the article
 * @param articleId - The article being read
 * @param creatorId - The creator of the article
 * @param durationMinutes - How long the user read in minutes
 * @param readingTimeMinutes - Estimated total reading time in minutes
 */
export async function trackArticleRead(
  userId: string,
  articleId: string,
  creatorId: string,
  durationMinutes: number,
  readingTimeMinutes?: number,
) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // If reading time not provided, fetch it from database
    let estimatedReadTime = readingTimeMinutes;
    if (!estimatedReadTime) {
      const { data: articleData } = await supabase
        .from("articles")
        .select("reading_time")
        .eq("id", articleId)
        .single();
      
      if (articleData?.reading_time) {
        estimatedReadTime = articleData.reading_time;
      }
    }

    // Try to update existing record for today, or insert new one
    const { data: existing } = await supabase
      .from("user_article_reads")
      .select("id, read_duration_minutes, article_reading_time_minutes")
      .eq("user_id", userId)
      .eq("article_id", articleId)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)
      .single();

    if (existing) {
      // Update existing record - add to duration
      await supabase
        .from("user_article_reads")
        .update({
          read_duration_minutes:
            existing.read_duration_minutes + durationMinutes,
          article_reading_time_minutes: estimatedReadTime || existing.article_reading_time_minutes,
        })
        .eq("id", existing.id);
    } else {
      // Insert new record
      await supabase.from("user_article_reads").insert({
        user_id: userId,
        article_id: articleId,
        creator_id: creatorId,
        read_duration_minutes: durationMinutes,
        article_reading_time_minutes: estimatedReadTime || 0,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking article read:", error);
    return { success: false, error };
  }
}

/**
 * Get creator earnings based on unique users who engaged for 50% of content duration
 * NEW EARNINGS MODEL: Counts unique users (not total time)
 * - Each user who watches 50%+ of video duration = 1 count
 * - Each user who listens 50%+ of podcast duration = 1 count
 * - Each user who reads 50%+ of article reading time = 1 count
 * @param creatorId - The creator's user ID
 * @param startDate - Start date for the period
 * @param endDate - End date for the period
 */
export async function getCreatorEarnings(
  creatorId: string,
  startDate: Date,
  endDate: Date,
) {
  try {
    const { data, error } = await supabase.rpc("calculate_creator_earnings", {
      p_creator_id: creatorId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.error("Error calculating earnings:", error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Error fetching creator earnings:", error);
    return null;
  }
}
