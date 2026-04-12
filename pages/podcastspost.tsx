// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoArrowBack, IoFlagOutline, IoThumbsUpOutline, IoChatbubbleOutline, IoPlayCircle, IoPauseCircle } from 'react-icons/io5';
import { MdVerified } from 'react-icons/md';
import { incrementViewCount, updatePodcastListenTime } from '../components/api';
import { trackPodcastListen } from '../lib/engagementTracking';
import {
  trackAdImpression,
  checkAdAvailability,
} from '../lib/adImpressionTracking';
import ReportContentModal from '../components/ReportContentModal';
import MetaTags from '../components/MetaTags';
import { fetchCurrentUserProfile, UserProfile } from '../lib/profileUtils';
import { useTheme } from '../context/ThemeProvider';
import { supabase } from '../components/supabase';
import { MdCheck } from 'react-icons/md'
import FollowPromptModal, {
  shouldShowFollowPrompt,
  markFollowPromptShown,
} from '../components/FollowPromptModal';

// Conditionally import TrackPlayer only on native platforms
let TrackPlayer: any = null;
let State: any = null;
let usePlaybackState: any = null;
let useProgress: any = null;
let setupPlayer: any = null;
let addTrack: any = null;

if (false) {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default;
  State = trackPlayerModule.State;
  usePlaybackState = trackPlayerModule.usePlaybackState;
  useProgress = trackPlayerModule.useProgress;

  const trackPlayerService = require("../lib/trackPlayerService");
  setupPlayer = trackPlayerService.setupPlayer;
  addTrack = trackPlayerService.addTrack;
}

// Subscription not required for listening

interface PodcastPost {
  id: string;
  author_id: string;
  username: string;
  title: string;
  content?: string;
  description: string;
  audio_urls: string[]; // Array of all episode audio URLs
  durations: number[]; // Array of all episode durations
  episode_count?: number; // Total number of episodes
  cover_image_url?: string;
  thumbnail_url?: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  category: string;
  tags: string[];
  published: boolean;
  profiles?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

export default function PodcastPost() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const params = (router.query as any) as { podcast?: PodcastPost } | undefined;
  const initialPodcast = params?.podcast;

  const [currentPodcast, setCurrentPodcast] = useState<PodcastPost | null>(
    initialPodcast || null,
  );

  // Use TrackPlayer hooks only on native platforms
  const playbackState =
    false ? usePlaybackState() : { state: null };
  const nativeProgress =
    false ? useProgress() : { position: 0, duration: 0 };

  // Web audio player - must be declared before use
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [webProgress, setWebProgress] = React.useState({
    position: 0,
    duration: 0,
    });

  // Use web progress on web, native progress on native
  const progress = true ? webProgress : nativeProgress;
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [playerInitialized, setPlayerInitialized] = useState(false);

  // ── Follow prompt state ─────────────────────────────────────────────
  const [followPromptUser, setFollowPromptUser] = useState<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    description?: string;
  } | null>(null);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [followingPodcastAuthor, setFollowingPodcastAuthor] = useState(false);
  const podcastFollowingSetRef = React.useRef<Set<string>>(new Set());
  // ────────────────────────────────────────────────────────────────────────

  // Track listen time for monetization
  const lastSavedTimeRef = React.useRef(0);
  const listenTimeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get episode count from podcast data
  // Parse audio_urls if it's a string (shouldn't happen with proper Supabase setup, but just in case)
  let parsedAudioUrls: string[] = [];
  if (currentPodcast?.audio_urls) {
    if (Array.isArray(currentPodcast.audio_urls)) {
      parsedAudioUrls = currentPodcast.audio_urls;
    } else if (typeof currentPodcast.audio_urls === "string") {
      try {
        parsedAudioUrls = JSON.parse(currentPodcast.audio_urls);
      } catch (e) {
        console.error("Failed to parse audio_urls:", e);
        parsedAudioUrls = [];
      }
    }
  }

  // Parse durations if it's a string
  let parsedDurations: number[] = [];
  if (currentPodcast?.durations) {
    if (Array.isArray(currentPodcast.durations)) {
      parsedDurations = currentPodcast.durations;
    } else if (typeof currentPodcast.durations === "string") {
      try {
        parsedDurations = JSON.parse(currentPodcast.durations);
      } catch (e) {
        console.error("Failed to parse durations:", e);
        parsedDurations = [];
      }
    }
  }

  const audioUrls = parsedAudioUrls;
  const durations = parsedDurations;

  const episodeCount = currentPodcast?.episode_count || audioUrls.length || 1;

  // Update playing state based on TrackPlayer state (native only)
  useEffect(() => {
    if (false && State) {
      setIsPlaying(playbackState.state === State.Playing);
    }
  }, [playbackState]);

  useEffect(() => {
    fetchCurrentUserProfile().then(setUserProfile);
  }, []);

  // Setup TrackPlayer (native only)
  useEffect(() => {
    const initPlayer = async () => {
      if (false && setupPlayer) {
        try {
          await setupPlayer();
          setPlayerInitialized(true);
          console.log("TrackPlayer initialized successfully");
        } catch (error) {
          console.error("Error initializing TrackPlayer:", error);
        }
      }
    };
    initPlayer();
  }, []);

  // Setup web audio player
  useEffect(() => {
    if (true && audioUrls.length > 0) {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();

        // Set up event listeners
        audioRef.current.addEventListener("loadedmetadata", () => {
          setWebProgress((prev) => ({
            ...prev,
            duration: audioRef.current?.duration || 0,
          }));
        });

        audioRef.current.addEventListener("timeupdate", () => {
          setWebProgress({
            position: audioRef.current?.currentTime || 0,
            duration: audioRef.current?.duration || 0,
          });
        });

        audioRef.current.addEventListener("ended", () => {
          setIsPlaying(false);
        });

        audioRef.current.addEventListener("play", () => {
          setIsPlaying(true);
        });

        audioRef.current.addEventListener("pause", () => {
          setIsPlaying(false);
        });
      }

      // Load new audio source - use current episode's audio URL
      const currentAudioUrl = audioUrls[currentEpisodeIndex];
      if (currentAudioUrl) {
        audioRef.current.src = currentAudioUrl;
      }
      audioRef.current.load();
      setIsPlaying(false);
    }

    // Cleanup
    return () => {
      if (true && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
  }, [currentEpisodeIndex, audioUrls]);

  // Load and play the podcast track (native only)
  useEffect(() => {
    const loadTrack = async () => {
      if (
        false &&
        playerInitialized &&
        currentPodcast &&
        addTrack
      ) {
        try {
          const currentAudioUrl = audioUrls[currentEpisodeIndex];
          if (!currentAudioUrl) return;
          const episodePodcast = {
            ...currentPodcast,
            audio_url: currentAudioUrl, // TrackPlayer expects singular audio_url
          };
          await addTrack(episodePodcast);
          console.log(
            "Track loaded:",
            currentPodcast.title,
            "- Episode",
            currentEpisodeIndex + 1,
          );
        } catch (error) {
          console.error("Error loading track:", error);
        }
      }
    };
    loadTrack();
  }, [
    currentPodcast?.id,
    playerInitialized,
    currentEpisodeIndex,
    audioUrls,
    durations,
  ]);

  // Debug logging
  useEffect(() => {
    if (currentPodcast) {
      console.log("=== PODCAST DEBUG DATA ===");
      console.log("Raw audio_urls:", currentPodcast.audio_urls);
      console.log("Type of audio_urls:", typeof currentPodcast.audio_urls);
      console.log("Raw durations:", currentPodcast.durations);
      console.log("Type of durations:", typeof currentPodcast.durations);
      console.log("Episode count field:", currentPodcast.episode_count);
      console.log("Parsed audioUrls:", audioUrls);
      console.log("audioUrls.length:", audioUrls.length);
      console.log("Parsed durations:", durations);
      console.log("Calculated episodeCount:", episodeCount);
      console.log("========================");
    }
  }, [currentPodcast?.id]);

  // Save any remaining listen time when podcast changes or component unmounts
  useEffect(() => {
    return () => {
      // Save any remaining listen time before switching podcasts
      const currentTime = progress.position || 0;
      if (currentPodcast?.id && currentTime > lastSavedTimeRef.current) {
        const remainingTime = Math.floor(
          currentTime - lastSavedTimeRef.current,
        );
        if (remainingTime > 0) {
          updatePodcastListenTime(currentPodcast.id, remainingTime);

          // Track engagement with 5-minute threshold
          const durationMinutes = remainingTime / 60;
          if (userProfile?.id && currentPodcast.author_id) {
            trackPodcastListen(
              userProfile.id,
              currentPodcast.id,
              currentPodcast.author_id,
              durationMinutes,
            ).catch((err) =>
              console.warn("Failed to track podcast listen:", err),
            );
          }
        }
      }
      lastSavedTimeRef.current = 0;
    };
  }, [currentPodcast?.id, progress.position, userProfile?.id]);

  // increment view_count when this podcast screen is opened
  useEffect(() => {
    const podcast = currentPodcast;
    if (!podcast || !podcast.id) return;
    // fire-and-forget best-effort increment
    (async () => {
      try {
        await incrementViewCount("podcasts", podcast.id);

        // Track ad impression only if ad is displayed
        const adAvailable = await checkAdAvailability();
        if (adAvailable && podcast.author_id) {
          await trackAdImpression(
            podcast.id,
            "podcast",
            podcast.author_id,
            userProfile?.id || null,
          );
        }
      } catch (err) {
        // Silently ignore errors - ad tracking and view counting are non-critical
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPodcast?.id]);

  // Update progress every second when playing and track listen time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        // Track listen time every 10 seconds
        const currentTime = progress.position || 0;
        const timeSinceLastSave = currentTime - lastSavedTimeRef.current;
        if (timeSinceLastSave >= 10 && currentPodcast?.id) {
          updatePodcastListenTime(
            currentPodcast.id,
            Math.floor(timeSinceLastSave),
          );

          // Track engagement with 5-minute threshold
          const durationMinutes = timeSinceLastSave / 60;
          if (userProfile?.id && currentPodcast.author_id) {
            trackPodcastListen(
              userProfile.id,
              currentPodcast.id,
              currentPodcast.author_id,
              durationMinutes,
            ).catch((err) =>
              console.warn("Failed to track podcast listen:", err),
            );
          }

          lastSavedTimeRef.current = currentTime;
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, progress.position, currentPodcast?.id, userProfile?.id]);

  const handlePlayPause = async () => {
    try {
      if (true && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
      } else if (false && TrackPlayer) {
        if (isPlaying) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
      }
    } catch (error) {
      console.error("Error playing/pausing audio:", error);
    }
  };

  /** Show follow prompt for this podcast's author */
  const maybeShowPodcastAuthorPrompt = async (authorId: string) => {
    try {
      if (!authorId || authorId === userProfile?.id) return;
      if (podcastFollowingSetRef.current.has(authorId)) return;
      if (userProfile?.id) {
        const { data } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", userProfile.id)
          .eq("following_id", authorId)
          .maybeSingle();
        if (data) { podcastFollowingSetRef.current.add(authorId); return; }
      }
      const show = await shouldShowFollowPrompt(authorId);
      if (!show) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .eq("id", authorId)
        .maybeSingle();
      setFollowPromptUser({
        id: authorId,
        name: profile?.full_name || profile?.username || currentPodcast?.username || "this creator",
        username: profile?.username || currentPodcast?.username,
        avatar: profile?.avatar_url || currentPodcast?.profiles?.avatar_url || undefined,
        description: profile?.bio || undefined,
      });
      setShowFollowPrompt(true);
      await markFollowPromptShown(authorId);
    } catch { /* silent */ }
  };

  const handlePodcastFollowFromPrompt = async () => {
    if (!followPromptUser || !userProfile?.id) { setShowFollowPrompt(false); return; }
    setFollowingPodcastAuthor(true);
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: userProfile.id,
        following_id: followPromptUser.id,
      });
      if (!error) podcastFollowingSetRef.current.add(followPromptUser.id);
    } catch { /* silent */ }
    finally { setFollowingPodcastAuthor(false); setShowFollowPrompt(false); setFollowPromptUser(null); }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (seconds: number): string => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Add a function to handle progress bar seeking
  const handleProgressBarPress = async (event: any) => {
    if (progress.duration) {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = 300; // Approximate width, you can make this dynamic
      const percentage = locationX / progressBarWidth;
      const newTime = percentage * progress.duration;

      if (true && audioRef.current) {
        audioRef.current.currentTime = newTime;
      } else if (false && TrackPlayer) {
        await TrackPlayer.seekTo(newTime);
      }
    }
  };

  if (!currentPodcast) {
    return (
      <div style={{...styles.container, backgroundColor: theme.background}}>
        <span style={{ padding: spacing.lg, color: theme.text, fontSize: fontSize.base }}>
          Podcast not found.
        </span>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title={currentPodcast?.title || "Podcast - Verrsa"}
        description={currentPodcast?.description || currentPodcast?.content || "Listen to this podcast on Verrsa"}
        image={currentPodcast?.id ? `https://www.verrsa.org/api/post?id=${encodeURIComponent(currentPodcast.id)}` : currentPodcast?.cover_image_url}
        url={typeof window !== "undefined" ? window.location.href : ""}
        type="article"
      />
      <div style={{...styles.container, backgroundColor: theme.background}}>
      <div style={{...styles.scrollContainer, overflowY: "auto"}}>
        {/* Cover Image */}
        {currentPodcast.cover_image_url && (
          <img
            src={currentPodcast.cover_image_url}
            alt={currentPodcast.title}
            style={styles.coverImage}
          />
        )}

        {/* Header positioned on top of cover image */}
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <IoArrowBack size={24} color="#fff" />
          </button>
          <span style={styles.headerTitle}>Podcast</span>
          <button
            style={styles.moreButton}
            onClick={() => setShowReportModal(true)}
          >
            <IoFlagOutline size={20} color="#fff" />
          </button>
        </div>

        {/* Podcast Info */}
        <div
          style={{...styles.infoContainer, backgroundColor: theme.background}}
        >
          {/* Author Info */}
          <div style={styles.authorContainer}>
            <button
              onClick={() => {
                if (currentPodcast?.author_id) {
                  maybeShowPodcastAuthorPrompt(currentPodcast.author_id).catch(() => {});
                  router.push(`/user/${currentPodcast.author_id}`);
                }
              }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={currentPodcast.profiles?.avatar_url || "/avatar.jpg"}
                alt="Avatar"
                style={styles.avatar}
              />
            </button>
            <div style={{ flex: 1 }}>
              <div style={styles.usernameContainer}>
                <span style={{...styles.username, color: theme.text}}>
                  {currentPodcast.profiles?.full_name ||
                    currentPodcast.username ||
                    "Unknown User"}
                </span>
                {currentPodcast.profiles?.is_verified && (
                  <MdVerified size={16} color="#00BFFF" style={{ marginLeft: spacing.xs }} />
                )}
              </div>
              <span
                style={{...styles.publishDate, color: theme.secondaryText}}
              >
                {formatDate(currentPodcast.created_at)}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 style={{...styles.title, color: theme.text}}>
            {currentPodcast.title}
          </h1>

          {/* Category and Duration */}
          <div style={styles.metaContainer}>
            <div style={styles.categoryContainer}>
              <span style={styles.category}>{currentPodcast.category}</span>
            </div>
            {durations[currentEpisodeIndex] > 0 && (
              <span style={{...styles.duration, color: theme.secondaryText}}>
                {formatDuration(durations[currentEpisodeIndex])}
              </span>
            )}
          </div>

          {/* Audio Progress - Enhanced */}
          <div style={styles.progressContainer}>
            <span style={{...styles.progressText, color: theme.secondaryText}}>
              {formatTime(progress.position || 0)} / {formatTime(progress.duration || 0)}
            </span>
            <button
              onClick={handleProgressBarPress}
              style={{...styles.progressBar, backgroundColor: theme.border}}
            >
              <div
                style={{
                  ...styles.progressFill,
                  width: progress.duration
                    ? `${((progress.position || 0) / progress.duration) * 100}%`
                    : "0%",
                  backgroundColor: "#00BFFF",
                }}
              />
            </button>
          </div>

          {/* Description */}
          <p style={{...styles.description, color: theme.text}}>
            {currentPodcast.description}
          </p>

          {/* Tags */}
          {currentPodcast.tags && currentPodcast.tags.length > 0 && (
            <div style={styles.tagsContainer}>
              {currentPodcast.tags.map((tag, index) => (
                <div
                  key={index}
                  style={{...styles.tag, backgroundColor: theme.cardBackground}}
                >
                  <span
                    style={{...styles.tagText, color: theme.secondaryText}}
                  >
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Episodes Selector under hashtags */}
          {episodeCount > 1 && (
            <div style={styles.episodesContainer}>
              <span style={{...styles.episodesLabel, color: theme.text}}>
                Episodes ({episodeCount})
              </span>
              <div style={{display: 'flex', gap: spacing.sm, overflowX: "auto", paddingBottom: spacing.sm}}>
                {Array.from({ length: episodeCount }, (_, idx) => (
                  <button
                    key={idx}
                    style={{
                      ...styles.episodeChip,
                      ...(idx === currentEpisodeIndex ? styles.episodeChipActive : {}),
                    }}
                    onClick={async () => {
                      // Save current episode listen time before switching
                      const currentTime = progress.position || 0;
                      if (
                        currentPodcast?.id &&
                        currentTime > lastSavedTimeRef.current
                      ) {
                        const remainingTime = Math.floor(
                          currentTime - lastSavedTimeRef.current,
                        );
                        if (remainingTime > 0) {
                          updatePodcastListenTime(
                            currentPodcast.id,
                            remainingTime,
                          );
                          const durationMinutes = remainingTime / 60;
                          if (userProfile?.id && currentPodcast.author_id) {
                            trackPodcastListen(
                              userProfile.id,
                              currentPodcast.id,
                              currentPodcast.author_id,
                              durationMinutes,
                            ).catch((err) =>
                              console.warn(
                                "Failed to track podcast listen:",
                                err,
                              ),
                            );
                          }
                        }
                      }

                      // Reset tracking for new episode
                      lastSavedTimeRef.current = 0;
                      setCurrentEpisodeIndex(idx);

                      try {
                        const newAudioUrl = audioUrls[idx];
                        if (!newAudioUrl) return;
                        if (true && audioRef.current) {
                          audioRef.current.src = newAudioUrl;
                          audioRef.current.load();
                          await audioRef.current.play();
                        } else if (
                          false &&
                          playerInitialized &&
                          addTrack &&
                          TrackPlayer
                        ) {
                          const episodePodcast = {
                            ...currentPodcast,
                            audio_url: newAudioUrl, // TrackPlayer expects singular audio_url
                          };
                          await addTrack(episodePodcast);
                          await TrackPlayer.play();
                        }
                      } catch (error) {
                        console.error("Error switching episode:", error);
                      }
                    }}
                  >
                    <span
                      style={{
                        ...styles.episodeText,
                        ...(idx === currentEpisodeIndex ? styles.episodeTextActive : {}),
                      }}
                    >
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Stats */}
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <IoThumbsUpOutline size={18} color={theme.secondaryText} />
              <span style={{...styles.statText, color: theme.secondaryText}}>
                {currentPodcast.like_count} {currentPodcast.like_count === 1 ? "like" : "likes"}
              </span>
            </div>
            <div style={styles.statItem}>
              <IoChatbubbleOutline size={18} color={theme.secondaryText} />
              <span style={{...styles.statText, color: theme.secondaryText}}>
                {currentPodcast.comment_count} {currentPodcast.comment_count === 1 ? "comment" : "comments"}
              </span>
            </div>
          </div>

          {/* Play Button */}
          {audioUrls.length > 0 ? (
            <button
              style={styles.playButton}
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <IoPauseCircle size={24} color="#fff" />
              ) : (
                <IoPlayCircle size={24} color="#fff" />
              )}
              <span style={styles.playButtonText}>
                {isPlaying ? "Pause" : "Play"} Podcast
              </span>
            </button>
          ) : (
            <div
              style={{...styles.playButton, backgroundColor: theme.border, opacity: 0.5}}
            >
              <IoPlayCircle size={24} color="#fff" />
              <span style={styles.playButtonText}>No audio available</span>
            </div>
          )}
          {/* All users can listen to any episodes; no gating UI here */}
        </div>
      </div>

      {/* Follow Prompt Modal */}
      <FollowPromptModal
        user={followPromptUser}
        visible={showFollowPrompt}
        following={followingPodcastAuthor}
        onFollow={handlePodcastFollowFromPrompt}
        onDismiss={() => { setShowFollowPrompt(false); setFollowPromptUser(null); }}
      />

      {/* Report Content Modal */}
      {showReportModal && userProfile && userProfile.id && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentId={currentPodcast.id}
          contentType="post"
          reportedUserId={currentPodcast.author_id}
          reporterUserId={userProfile.id}
        />
      )}
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flex: 1,
    minHeight: '100vh',
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${spacing.xl5}px ${spacing.lg}px ${spacing.lg}px`,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  backButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: radius.xl2,
    padding: spacing.md,
    width: 40,
    height: 40,
    display: 'flex',
    justifyContent: "center",
    alignItems: "center",
    border: 'none',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 600,
    color: "#fff",
    textShadow: "0 1px 3px rgba(0, 0, 0, 0.8)",
  },
  moreButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: radius.xl2,
    padding: spacing.md,
    width: 40,
    height: 40,
    display: 'flex',
    justifyContent: "center",
    alignItems: "center",
    border: 'none',
    cursor: 'pointer',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  coverImage: {
    width: "100%",
    height: 350,
    objectFit: "cover",
  },
  infoContainer: {
    padding: spacing.lg,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  authorContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.base,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    marginRight: spacing.md,
    objectFit: 'cover',
  },
  usernameContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: fontSize.base,
    fontWeight: 600,
  },
  publishDate: {
    fontSize: fontSize.md,
    marginTop: spacing.px,
  },
  title: {
    fontSize: fontSize.xl3,
    fontWeight: 700,
    marginBottom: spacing.base,
    lineHeight: '32px',
    margin: `0 0 ${spacing.base}px 0`,
  },
  metaContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.base,
  },
  categoryContainer: {
    backgroundColor: "#00BFFF",
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderRadius: radius.lg,
    marginRight: spacing.md,
  },
  category: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: 500,
  },
  duration: {
    fontSize: fontSize.md,
  },
  progressContainer: {
    marginBottom: spacing.base,
  },
  progressText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    textAlign: "center",
    display: 'block',
  },
  progressBar: {
    height: 4,
    borderRadius: radius.xs,
    overflow: "hidden",
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.xs,
    transition: 'width 0.2s ease',
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: '24px',
    marginBottom: spacing.lg,
  },
  tagsContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
  },
  tag: {
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: fontSize.sm,
  },
  statsContainer: {
    display: "flex",
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  statItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  statText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  playButton: {
    backgroundColor: "#00BFFF",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: `${spacing.base}px`,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    border: 'none',
    cursor: 'pointer',
  },
  playButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: 600,
    marginLeft: spacing.sm,
  },
  episodesContainer: {
    marginBottom: spacing.lg,
  },
  episodesLabel: {
    fontSize: fontSize.md,
    fontWeight: 600,
    marginBottom: spacing.sm,
    display: 'block',
  },
  episodeChip: {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.xl,
    backgroundColor: "#f0f0f0",
    border: 'none',
    cursor: 'pointer',
    minWidth: 40,
  },
  episodeChipActive: {
    backgroundColor: "#00BFFF",
  },
  episodeText: {
    fontSize: fontSize.md,
    color: "#666",
  },
  episodeTextActive: {
    color: "#fff",
    fontWeight: 600,
  },
};
