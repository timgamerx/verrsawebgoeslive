// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { supabase } from '../components/supabase';
import { IoChevronBack, IoStar, IoVideocam } from 'react-icons/io5';
import SharePostModal from '../components/SharePostModal.web';
import { useLiveStream } from "../context/LiveStreamProvider";
// Mobile-only: inAppPurchases stubbed for web
const iapService = { purchaseProduct: () => Promise.resolve(null), initialize: () => {}, destroy: () => {} };
const PRODUCT_IDS: any = {};
const GIFT_METADATA: any = {};
import { AiOutlineCheck } from 'react-icons/ai'
import { FaCheck } from 'react-icons/fa'

// Conditionally import Agora config only on native platforms
let AGORA_CONFIG: any = null;
let getChannelName: any = null;
let generateAgoraToken: any = null;

if (false) {
  const agoraConfig = require("../lib/agoraConfig");
  AGORA_CONFIG = agoraConfig.AGORA_CONFIG;
  getChannelName = agoraConfig.getChannelName;
  generateAgoraToken = agoraConfig.generateAgoraToken;
}

// Conditionally import Agora only on native platforms
let RtcEngine: any = null;
let ClientRoleType: any = null;
let ChannelProfileType: any = null;
let createAgoraRtcEngine: any = null;
let RtcSurfaceView: any = null;
let RtcLocalView: any = null;
let RtcRemoteView: any = null;

if (false) {
  try {
    const AgoraRTC = require("react-native-agora");
    RtcEngine = AgoraRTC.default;
    ClientRoleType = AgoraRTC.ClientRoleType;
    ChannelProfileType = AgoraRTC.ChannelProfileType;
    createAgoraRtcEngine = AgoraRTC.createAgoraRtcEngine;
    RtcSurfaceView = AgoraRTC.RtcSurfaceView;
  } catch (error) {
    console.warn("Agora SDK not available:", error);
  }
}

const height = typeof window !== "undefined" ? window.innerHeight : 800;
const width = typeof window !== "undefined" ? window.innerWidth : 1200;

type Heart = {
  id: string;
  anim: any;
  x: number;
};

export default function CommunityLive() {
  const router = useRouter();
  const { communityId, resumeMinimized } = router.query as {
    communityId?: string;
    resumeMinimized?: string | boolean;
  };
  const { minimizeLiveStream, resumeLiveStream, endLiveStream } =
    useLiveStream();

  const [hearts, setHearts] = useState<Heart[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [facing, setFacing] = useState("front");
  const [permission, setPermission] = useState({ granted: true });
  const requestPermission = async () => {
    setPermission({ granted: true });
    return { granted: true };
  };
  const heartCounter = useRef(0);
  const [comments, setComments] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liveStreamId, setLiveStreamId] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [communityOwner, setCommunityOwner] = useState<any>(null);
  const [sponsorAmount, setSponsorAmount] = useState<string>("");
  const [donateAmount, setDonateAmount] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [totalTipsReceived, setTotalTipsReceived] = useState<number>(0);
  const liveId = `community-${communityId}-live`;

  // Agora states
  const agoraEngineRef = useRef<any>(null);
  const [isAgoraInitialized, setIsAgoraInitialized] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  // Handle resuming from minimized state
  useEffect(() => {
    if (resumeMinimized) {
      const liveStreamInfo = (global as any).activeLiveStream;
      if (liveStreamInfo) {
        setLiveStreamId(liveStreamInfo.liveStreamId);
        setViewerCount(liveStreamInfo.viewerCount);
        setLikeCount(liveStreamInfo.likeCount);
        setIsLiveActive(liveStreamInfo.isActive);
      }
      setIsMinimized(false);
      // Use context to resume
      resumeLiveStream();
    }
  }, [resumeMinimized]); // Remove resumeLiveStream from dependencies

  const initializeLiveStream = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      // Get community owner info
      const { data: community } = await supabase
        .from("community")
        .select(
          "created_by, name, description, profiles:created_by(id, full_name, username)",
        )
        .eq("id", communityId)
        .single();

      if (community) {
        const userIsOwner = user.id === community.created_by;
        setCommunityOwner({
          id: community.created_by,
          ...(community.profiles as any),
        });
        // Check if current user is the owner
        setIsOwner(userIsOwner);
      }

      // Create or get existing live stream
      const { data: existingStream } = await supabase
        .from("live_streams")
        .select("*")
        .eq("community_id", communityId)
        .eq("is_active", true)
        .single();

      if (existingStream) {
        setLiveStreamId(existingStream.id);
        setLikeCount(existingStream.like_count || 0);
      } else {
        // Create new live stream
        const { data: newStream, error } = await supabase
          .from("live_streams")
          .insert({
            community_id: communityId,
            streamer_id: user.id,
            title: "Community Live Stream",
            is_active: true,
            like_count: 0,
            viewer_count: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating live stream:", error);
        } else if (newStream) {
          setLiveStreamId(newStream.id);
          setLikeCount(0);

          // Notify followers plus interested, recently active users that the creator is live
          if (community && user.id === community.created_by) {
            (async () => {
              try {
                const [{ getLiveAudienceUserIds }, { notifyCreatorWentLive }] =
                  await Promise.all([
                    import("../lib/feedRanking"),
                    import("../lib/notificationService"),
                  ]);

                const creatorName =
                  user.user_metadata?.full_name ||
                  user.user_metadata?.username ||
                  (community.profiles as any)?.full_name ||
                  (community.profiles as any)?.username ||
                  "A creator";
                const liveTitle = community.name || "Community Live Stream";
                const audienceIds = await getLiveAudienceUserIds({
                  creatorId: user.id,
                  interestText: `${community.name || ""} ${community.description || ""}`,
                  communityId,
                });

                await Promise.allSettled(
                  audienceIds.map((audienceUserId) =>
                    notifyCreatorWentLive(
                      audienceUserId,
                      creatorName,
                      user.id,
                      newStream.id,
                      liveTitle,
                    ),
                  ),
                );
              } catch (error) {
                console.error(
                  "Failed to notify live audience about live stream:",
                  error,
                );
              }
            })();
          }
        }
      }
    } catch (error) {
      console.error("Error initializing live stream:", error);
    }
  };

  // Initialize Agora RTC Engine
  const initializeAgora = async () => {
    if (true || !createAgoraRtcEngine) {
      console.log("Agora not available on web or SDK not loaded");
      return;
    }

    try {
      // Create Agora engine
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;

      // Initialize the engine
      engine.initialize({
        appId: AGORA_CONFIG.appId,
      });

      // Enable video
      engine.enableVideo();

      // Set channel profile to live broadcasting
      engine.setChannelProfile(
        ChannelProfileType.ChannelProfileLiveBroadcasting,
      );

      // Register event handlers
      engine.registerEventHandler({
        onJoinChannelSuccess: (connection: any, elapsed: number) => {
          console.log("Successfully joined channel", connection.channelId);
          setIsJoined(true);
        },
        onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
          console.log("Remote user joined:", remoteUid);
          setRemoteUids((prev) => [...prev, remoteUid]);
        },
        onUserOffline: (connection: any, remoteUid: number, reason: number) => {
          console.log("Remote user left:", remoteUid);
          setRemoteUids((prev) => prev.filter((uid) => uid !== remoteUid));
        },
        onError: (err: number, msg: string) => {
          console.error("Agora error:", err, msg);
        },
      });

      setIsAgoraInitialized(true);
      console.log("Agora engine initialized successfully");
    } catch (error) {
      console.error("Error initializing Agora:", error);
    }
  };

  // Join Agora channel
  const joinChannel = async () => {
    if (!agoraEngineRef.current || !isAgoraInitialized) {
      console.warn("Agora not initialized");
      return;
    }

    try {
      const channelName = getChannelName(communityId);
      const uid = 0; // 0 means Agora will assign a random UID

      // Set client role (publisher for owner, audience for viewers)
      const role = isOwner
        ? ClientRoleType.ClientRoleBroadcaster
        : ClientRoleType.ClientRoleAudience;
      agoraEngineRef.current.setClientRole(role);

      // Generate token (null for development without token server)
      const token = await generateAgoraToken(
        channelName,
        uid,
        isOwner ? "publisher" : "audience",
      );

      // Join the channel
      await agoraEngineRef.current.joinChannel(token, channelName, uid, {
        clientRoleType: role,
      });

      console.log(
        `Joined channel ${channelName} as ${isOwner ? "broadcaster" : "audience"}`,
      );
    } catch (error) {
      console.error("Error joining channel:", error);
      window.alert("Failed to join live stream. Please try again.");
    }
  };

  // Leave Agora channel
  const leaveChannel = async () => {
    if (!agoraEngineRef.current) return;

    try {
      await agoraEngineRef.current.leaveChannel();
      setIsJoined(false);
      setRemoteUids([]);
      console.log("Left channel successfully");
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  };

  // Cleanup Agora on unmount
  const cleanupAgora = async () => {
    if (!agoraEngineRef.current) return;

    try {
      await leaveChannel();
      agoraEngineRef.current.release();
      agoraEngineRef.current = null;
      setIsAgoraInitialized(false);
      console.log("Agora engine released");
    } catch (error) {
      console.error("Error cleaning up Agora:", error);
    }
  };

  useEffect(() => {
    // Initialize live stream
    initializeLiveStream();

    // Initialize Agora on native platforms
    if (false) {
      initializeAgora();
    }

    // Request camera permission when component mounts
    if (!permission?.granted) {
      requestPermission();
    }
    // Fetch initial comments
    fetchComments();
    // Subscribe to new comments
    const commentSub = supabase
      .channel("live-comments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_comments",
          filter: `live_id=eq.${liveId}`,
        },
        (payload) => {
          setComments((prev) => {
            const updatedComments = [...prev, payload.new];
            // Keep only the last 7 messages
            return updatedComments.slice(-7);
          });
        },
      )
      .subscribe();
    // Subscribe to viewers
    const viewerSub = supabase
      .channel("live-viewers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_viewers",
          filter: `live_id=eq.${liveId}`,
        },
        async () => {
          const { count } = await supabase
            .from("live_viewers")
            .select("*", { count: "exact", head: true })
            .eq("live_id", liveId);
          setViewerCount(count || 0);
        },
      )
      .subscribe();
    // Add self as viewer
    addViewer();
    // Initial viewer count
    fetchViewerCount();
    return () => {
      supabase.removeChannel(commentSub);
      supabase.removeChannel(viewerSub);
      // Only remove viewer if not minimized
      if (!isMinimized) {
        removeViewer();
      }
      // Cleanup Agora
      cleanupAgora();
    };
    // eslint-disable-next-line
  }, []);

  // Join Agora channel when initialized and owner status is known
  useEffect(() => {
    if (isAgoraInitialized && currentUser && isOwner !== null) {
      joinChannel();
    }
  }, [isAgoraInitialized, currentUser, isOwner]);

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from("live_comments")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `,
        )
        .eq("live_id", liveId)
        .order("created_at", { ascending: false })
        .limit(7);

      // Reverse to show oldest first
      setComments(data ? data.reverse() : []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  };

  const fetchViewerCount = async () => {
    const { count } = await supabase
      .from("live_viewers")
      .select("*", { count: "exact", head: true })
      .eq("live_id", liveId);
    setViewerCount(count || 0);
  };

  const fetchViewers = async () => {
    try {
      const { data } = await supabase
        .from("live_viewers")
        .select(
          `
          viewer_id,
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `,
        )
        .eq("live_id", liveId);

      setViewers(data || []);
    } catch (error) {
      console.error("Error fetching viewers:", error);
      setViewers([]);
    }
  };

  const addViewer = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const viewerId = user?.id || `${Date.now()}-${Math.random()}`;

      await supabase.from("live_viewers").insert({
        live_id: liveId,
        viewer_id: viewerId,
        user_id: user?.id,
      });

      // Store in ref for removal
      (global as any).liveViewerId = viewerId;
    } catch (error) {
      console.error("Error adding viewer:", error);
    }
  };
  const handleLike = async () => {
    try {
      // Optimistic update
      setLikeCount((prev) => prev + 1);

      // Add floating heart animation
      const newHeart = {
        id: `heart-${heartCounter.current++}`,
        anim: { _value: 0 },
        x: Math.random() * 50,
      };

      setHearts((prev) => [...prev, newHeart]);

      // Start animation - simplified for web
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 3000);

      // Update database
      if (liveStreamId) {
        await supabase
          .from("live_streams")
          .update({
            like_count: likeCount + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", liveStreamId);
      }
    } catch (error) {
      console.error("Error liking stream:", error);
      // Revert on error
      setLikeCount((prev) => Math.max(0, prev - 1));
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    const newMessage = {
      id: Date.now(), // Temporary ID
      live_id: liveId,
      user_id: currentUser.id,
      content: message.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        full_name: currentUser.user_metadata?.full_name,
        username: currentUser.user_metadata?.username,
        avatar_url: currentUser.user_metadata?.avatar_url,
      },
    };

    // Add message immediately to UI
    setComments((prev) => {
      const updatedComments = [...prev, newMessage];
      // Keep only the last 7 messages
      return updatedComments.slice(-7);
    });

    // Clear input immediately
    setMessage("");

    try {
      const { error } = await supabase.from("live_comments").insert({
        live_id: liveId,
        user_id: currentUser.id,
        content: newMessage.content,
        created_at: newMessage.created_at,
      });

      if (error) {
        console.error("Error sending message:", error);
        // Remove the optimistic message on error
        setComments((prev) => prev.filter((msg) => msg.id !== newMessage.id));
        return;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the optimistic message on error
      setComments((prev) => prev.filter((msg) => msg.id !== newMessage.id));
    }
  };

  const removeViewer = async () => {
    try {
      const viewerId = (global as any).liveViewerId;
      if (viewerId) {
        await supabase
          .from("live_viewers")
          .delete()
          .eq("live_id", liveId)
          .eq("viewer_id", viewerId);
      }
    } catch (error) {
      console.error("Error removing viewer:", error);
    }
  };

  useEffect(() => {
    if (showGiftsModal) {
      loadUserBalance();
    }
  }, [showGiftsModal]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newHeart = {
        id: `heart-${heartCounter.current++}`,
        anim: { _value: 0 },
        x: Math.random() * 50,
      };

      setHearts((prev) => [...prev, newHeart]);

      // Start animation - simplified for web
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 3000);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleEndLive = async () => {
    // Only owner can end the live stream
    if (!isOwner) {
      if (true) {
        alert(message);
      } else {
        window.alert(message);
      }
      return;
    }

    // Use native confirm on web, Alert on mobile
    const confirmed =
      true
        ? window.confirm("Are you sure you want to end the live stream?")
        : await new Promise((resolve) => {
            if (window.confirm("Are you sure you want to end the live stream?")) { resolve(false) }
          });

    if (!confirmed) return;

    try {
      // Leave Agora channel first
      await leaveChannel();

      // Update live stream status in database
      if (liveStreamId) {
        await supabase
          .from("live_streams")
          .update({
            is_active: false,
            ended_at: new Date().toISOString(),
          })
          .eq("id", liveStreamId);
      }

      // Use context to end live stream
      await endLiveStream();

      // Notify creator of live earnings summary
      if (isOwner && currentUser && totalTipsReceived > 0) {
        try {
          const { notifyLiveEarnings } = await import("../lib/notificationService");
          await notifyLiveEarnings(currentUser.id, totalTipsReceived, "USD", liveStreamId || "");
        } catch (e) {
          console.error("Failed to send live earnings notification:", e);
        }
      }

      // Set live as inactive
      setIsLiveActive(false);

      // Clear hearts
      setHearts([]);

      // Remove viewer
      await removeViewer();

      // Cleanup Agora
      await cleanupAgora();

      //back to previous screen
      router.back();

      console.log("Live stream ended and updated in database");
    } catch (error) {
      console.error("Error ending live stream:", error);
      if (true) {
        alert("Failed to end live stream properly");
      } else {
        window.alert("Failed to end live stream properly");
      }
    }
  };

  const toggleCameraFacing = () => {
  const router = useRouter();
    if (agoraEngineRef.current && false) {
      try {
        // Switch camera using Agora
        agoraEngineRef.current.switchCamera();
        setFacing((current) => (current === "back" ? "front" : "back"));
      } catch (error) {
        console.error("Error switching camera:", error);
      }
    } else {
      setFacing((current) => (current === "back" ? "front" : "back"));
    }
  };

  const loadUserBalance = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: balanceData } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      setUserBalance(parseFloat(balanceData?.balance || "0"));
    } catch (error) {
      console.error("Error loading balance:", error);
      setUserBalance(0);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);

    // Use the context to manage minimized state
    minimizeLiveStream({
      communityId,
      liveStreamId,
      isActive: isLiveActive,
      viewerCount,
      likeCount,
    });

    //back to previous screen while keeping the live stream active
    router.back();
  };

  const handleGiftPurchase = async (
    productId: string,
    giftName: string,
    price: number,
  ) => {
    if (!currentUser || !communityOwner || !liveStreamId) {
      window.alert("Unable to send gift at this time");
      return;
    }

    try {
      // Check user balance
      const { data: balanceData } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", currentUser.id)
        .single();


      if (userBalance < price) {
        if (window.confirm("You don't have enough balance to send this gift. Please top up your balance.")) {
  (() => {
    setShowGiftsModal(false);
                setTimeout(() => {
                  router.push("/balance");
                }, 100);
  })();
}
        return;
      }

      // Deduct from balance
      const { error: debitError } = await supabase.rpc("debit_user_balance", {
        p_user_id: currentUser.id,
        p_amount: price,
        p_description: `Sent ${giftName} gift`,
        p_reference: `${liveStreamId}-gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        p_metadata: {
          type: "gift",
          giftName: giftName,
          recipientId: communityOwner.id,
          liveStreamId: liveStreamId,
        },
      });

      if (debitError) throw debitError;

      // Record gift in live_gifts table
      const platformFee = price * 0.3;
      const recipientAmount = price * 0.7;

      const { error: giftInsertError } = await supabase
        .from("live_gifts")
        .insert({
          sender_id: currentUser.id,
          recipient_id: communityOwner.id,
          live_stream_id: liveStreamId,
          community_id: communityId,
          product_id: productId,
          gift_type: "gift",
          gift_name: giftName,
          total_amount: price,
          platform_amount: platformFee,
          recipient_amount: recipientAmount,
          withdrawn: false,
        });

      if (giftInsertError) {
        console.error("Error inserting gift record:", giftInsertError);
        throw giftInsertError;
      }

      setShowGiftsModal(false);
      loadUserBalance(); // Reload balance after transaction

      // Send notification to recipient about gift
      try {
        const { notifyTipReceived } =
          await import("../lib/notificationService");
        const senderName =
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.username ||
          "Someone";

        await notifyTipReceived(
          communityOwner.id,
          senderName,
          currentUser.id,
          recipientAmount, // The amount creator receives (after platform fee)
          "USD",
        );

        // Accumulate tips for end-of-session earnings summary
        setTotalTipsReceived((prev) => prev + recipientAmount);
      } catch (error) {
        console.error("Failed to send gift notification:", error);
      }

      window.alert(`${giftName} sent successfully!`);
    } catch (error) {
      console.error("Error sending gift:", error);
      window.alert("Failed to send gift. Please try again.");
    }
  };

  const handleSponsor = async (tier: 1 | 2 | 3) => {
    if (!currentUser || !communityOwner || !liveStreamId) {
      window.alert("Unable to sponsor at this time");
      return;
    }

    const amounts = [5, 10, 25];
    const amount = amounts[tier - 1];

    try {
      // Check user balance
      const { data: balanceData } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", currentUser.id)
        .single();


      if (userBalance < amount) {
        if (window.confirm("You don't have enough balance to sponsor. Please top up your balance.")) {
  (() => {
    setShowGiftsModal(false);
                setTimeout(() => {
                  router.push("/balance");
                }, 100);
  })();
}
        return;
      }

      // Deduct from balance
      const { error: debitError } = await supabase.rpc("debit_user_balance", {
        p_user_id: currentUser.id,
        p_amount: amount,
        p_description: `Sponsored $${amount}`,
        p_reference: `${liveStreamId}-sponsor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        p_metadata: {
          type: "sponsor",
          recipientId: communityOwner.id,
          liveStreamId: liveStreamId,
        },
      });

      if (debitError) throw debitError;

      // Record sponsorship in live_gifts table
      const platformFee = amount * 0.3;
      const recipientAmount = amount * 0.7;

      const { error: sponsorInsertError } = await supabase
        .from("live_gifts")
        .insert({
          sender_id: currentUser.id,
          recipient_id: communityOwner.id,
          live_stream_id: liveStreamId,
          community_id: communityId,
          product_id: `sponsor_tier_${tier}`,
          gift_type: "sponsor",
          gift_name: null,
          total_amount: amount,
          platform_amount: platformFee,
          recipient_amount: recipientAmount,
          withdrawn: false,
        });

      if (sponsorInsertError) {
        console.error("Error inserting sponsor record:", sponsorInsertError);
        throw sponsorInsertError;
      }

      setShowGiftsModal(false);
      loadUserBalance(); // Reload balance after transaction
      window.alert(`Sponsored $${amount} successfully!`);
    } catch (error) {
      console.error("Error sponsoring:", error);
      window.alert("Failed to sponsor. Please try again.");
    }
  };

  const handleDonate = async (tier: 1 | 2 | 3) => {
    if (!currentUser || !communityOwner || !liveStreamId) {
      window.alert("Unable to donate at this time");
      return;
    }

    const amounts = [5, 10, 25];
    const amount = amounts[tier - 1];

    try {
      // Check user balance
      const { data: balanceData } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", currentUser.id)
        .single();


      if (userBalance < amount) {
        if (window.confirm("You don't have enough balance to donate. Please top up your balance.")) {
  (() => {
    setShowGiftsModal(false);
                setTimeout(() => {
                  router.push("/balance");
                }, 100);
  })();
}
        return;
      }

      // Deduct from balance
      const { error: debitError } = await supabase.rpc("debit_user_balance", {
        p_user_id: currentUser.id,
        p_amount: amount,
        p_description: `Donated $${amount}`,
        p_reference: `${liveStreamId}-donate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        p_metadata: {
          type: "donate",
          recipientId: communityOwner.id,
          liveStreamId: liveStreamId,
        },
      });

      if (debitError) throw debitError;

      // Record donation in live_gifts table
      const platformFee = amount * 0.3;
      const recipientAmount = amount * 0.7;

      const { error: donateInsertError } = await supabase
        .from("live_gifts")
        .insert({
          sender_id: currentUser.id,
          recipient_id: communityOwner.id,
          live_stream_id: liveStreamId,
          community_id: communityId,
          product_id: `donate_tier_${tier}`,
          gift_type: "donate",
          gift_name: null,
          total_amount: amount,
          platform_amount: platformFee,
          recipient_amount: recipientAmount,
          withdrawn: false,
        });

      if (donateInsertError) {
        console.error("Error inserting donate record:", donateInsertError);
        throw donateInsertError;
      }

      setShowGiftsModal(false);
      loadUserBalance(); // Reload balance after transaction
      window.alert(`Donated $${amount} successfully!`);
    } catch (error) {
      console.error("Error donating:", error);
      window.alert("Failed to donate. Please try again.");
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <div style={styles.container}>
        <span style={styles.permissionText}>Loading camera...</span>
      </div>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <div style={styles.container}>
        <span style={styles.permissionText}>
          We need your permission to show the camera
        </span>
        <button
          style={styles.permissionButton}
          onClick={requestPermission}
        >
          <span style={styles.permissionButtonText}>Grant Permission</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Live Camera Background */}
      {true ? (
        <div style={{...(styles.camera || {}), backgroundColor: "#1a1a1a"}}>
          <div style={styles.webCameraPlaceholder}>
            <IoChevronBack />
            <span style={styles.webCameraText}>
              {isOwner
                ? "Camera preview not available on web"
                : "Viewing live stream"}
            </span>
            <span style={styles.webCameraSubText}>
              {isOwner
                ? "Your stream is still live and visible to viewers"
                : "Stream from community owner"}
            </span>
          </div>
        </div>
      ) : isOwner ? (
        // Owner sees their camera - what they're broadcasting (Agora local view)
        RtcSurfaceView && isJoined ? (
          <RtcSurfaceView
            style={styles.camera}
            canvas={{ uid: 0 }}
            zOrderMediaOverlay={true}
          />
        ) : (
          <div style={{...(styles.camera || {}), backgroundColor: "#1a1a1a"}}>
            <div style={styles.webCameraPlaceholder}>
              <IoVideocam />
              <span style={styles.webCameraText}>
                {isAgoraInitialized
                  ? "Connecting..."
                  : "Initializing camera..."}
              </span>
            </div>
          </div>
        )
      ) : // Viewers see the stream from owner (Agora remote view)
      RtcSurfaceView && remoteUids.length > 0 ? (
        <RtcSurfaceView
          style={styles.camera}
          canvas={{ uid: remoteUids[0] }}
          zOrderMediaOverlay={true}
        />
      ) : (
        <div style={{...(styles.camera || {}), backgroundColor: "#1a1a1a"}}>
          <div style={styles.webCameraPlaceholder}>
            <IoVideocam />
            <span style={styles.webCameraText}>
              {isJoined ? "Waiting for stream..." : "Connecting..."}
            </span>
            <span style={styles.webCameraSubText}>
              Stream from{" "}
              {communityOwner?.full_name ||
                communityOwner?.username ||
                "Community Owner"}
            </span>
          </div>
        </div>
    )}
      {/* Top Bar */}
      <div style={styles.topBar}>
        {/* Back button */}

        <div style={styles.liveInfo}>
          <span style={styles.liveTag}>
            {isLiveActive ? "🟢 LIVE" : "Stream Ended"}
          </span>
          <button
            style={styles.viewersContainer}
            onClick={() => {
              if (isOwner && isLiveActive) {
                fetchViewers();
                setShowViewersModal(true);
              }
            }}
            disabled={!isOwner || !isLiveActive}
          >
            <AiOutlineCheck />
            <span style={styles.viewersText}>{viewerCount}</span>
          </button>
        </div>

        {/* Spacer to push live info to center */}
        <div style={{ width: 50 }} />
      </div>

      {isOwner && (
        <button
          style={{...(styles.endBtn || {}), ...(!isLiveActive ? styles.endBtnDisabled : {})}}
          onClick={handleEndLive}
          disabled={!isLiveActive}
        >
          <span
            style={{ color: isLiveActive ? "red" : "#fff", fontWeight: "600" }}
          >
            {isLiveActive ? "End Live" : "Ended"}
          </span>
        </button>
    )}
      {/* Minimize button */}
      {isLiveActive && (
        <button
          style={styles.minimizeButton}
          onClick={handleMinimize}
        >
          <AiOutlineCheck />
        </button>
    )}
      {/* Camera flip button - Only show for owner on native */}
      {isLiveActive && false && isOwner && (
        <button
          style={styles.flipButton}
          onClick={toggleCameraFacing}
        >
          <AiOutlineCheck />
        </button>
    )}
      {/* Show content only if live is active */}
      {isLiveActive && (
        <>
          {/* Invite Button */}
          <button
            style={styles.inviteBtn}
            onClick={() => setShowShareModal(true)}
          >
            <span style={{ color: "#fff" }}>invite Others to join</span>
            <FaCheck />
          </button>

          {/* Comments */}
          <div
            data={comments}
            keyExtractor={(item) =>
              item.id?.toString() || Math.random().toString()
            }
            renderItem={({ item }) => (
              <div style={styles.comment}>
                <span style={{ color: "#fff", fontWeight: "bold" }}>
                  {item.profiles?.full_name ||
                    item.profiles?.username ||
                    item.username ||
                    "Anonymous"}
                  :
                </span>
                <span style={{ color: "#fff", marginLeft: spacing.xs }}>
                  {item.content || item.text}
                </span>
              </div>
                  )}
            style={styles.commentList}
          />

          {/* Message Input */}
          <div>
            <input
              placeholder="Type a message here....."
              placeholderTextColor="#ccc"
              style={styles.input}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { sendMessage(); } }}
              
            />
          </div>

          {/* Likes */}
          <div style={styles.likes}>
            <div
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.base }}
            >
              <div style={{ alignItems: "center" }}>
                <button onClick={handleLike}>
                  <AiOutlineCheck />
                </button>
                <span style={{ color: "#fff", fontSize: fontSize.sm, marginTop: spacing.xs }}>
                  {likeCount} likes
                </span>
              </div>

              <div style={{ alignItems: "center" }}>
                <button onClick={() => setShowGiftsModal(true)}>
                  <IoChevronBack />
                </button>
                <span style={{ color: "#fff", fontSize: fontSize.sm, marginTop: spacing.xs }}>
                  Gifts
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          style={{...(styles.floatingHeart || {})}}
        >
          <AiOutlineCheck />
        </div>
      ))}

      {/* Share Modal */}
      <SharePostModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Join our Live Stream!"
        url={`https://www.verrsa.org/community/${communityId}/live`}
        postId={communityId}
        postType="community"
      />

      {/* Viewers Modal */}
      {showViewersModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.viewersModalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                Live Viewers ({viewers.length})
              </span>
              <button onClick={() => setShowViewersModal(false)}>
                <AiOutlineCheck />
              </button>
            </div>

            <div style={{...(styles.viewersList), overflowY: "auto"}}>
              {viewers.length === 0 ? (
                <div style={styles.emptyViewers}>
                  <AiOutlineCheck />
                  <span style={styles.emptyText}>No viewers yet</span>
                </div>
              ) : (
                viewers.map((viewer, index) => (
                  <div
                    key={viewer.viewer_id || index}
                    style={styles.viewerItem}
                  >
                    <img
                      src={{
                        uri:
                          viewer.profiles?.avatar_url ||
                          "https://i.pravatar.cc/100",
                      }}
                      style={styles.viewerAvatar}
                    />
                    <div style={styles.viewerInfo}>
                      <span style={styles.viewerName}>
                        {viewer.profiles?.full_name ||
                          viewer.profiles?.username ||
                          "Anonymous"}
                      </span>
                      <span style={styles.viewerUsername}>
                        @{viewer.profiles?.username || "user"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    )}
      {/* Gifts Modal */}
      {showGiftsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.giftsModal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Send a Gift</span>
              <button onClick={() => setShowGiftsModal(false)}>
                <AiOutlineCheck />
              </button>
            </div>

            {/* Balance Display */}
            <div style={styles.balanceContainer}>
              <div style={styles.balanceInfo}>
                <IoChevronBack />
                <span style={styles.balanceText}>
                  Your Balance: ${userBalance.toFixed(2)}
                </span>
              </div>
              {userBalance < 1 && (
                <button
                  style={styles.topUpLink}
                  onClick={() => {
                    setShowGiftsModal(false);
                    setTimeout(() => {
                      router.push("/balance");
                    }, 100);
                  }}
                >
                  <span style={styles.topUpLinkText}>Top Up Balance</span>
                </button>
                    )}
            </div>

            {userBalance < 1 && (
              <div style={styles.insufficientBalanceWarning}>
                <IoChevronBack />
                <span style={styles.warningText}>
                  Insufficient balance. Please add money to send gifts.
                </span>
              </div>
          )}
            <div style={{...(styles.giftsGrid), overflowY: "auto"}}>
              {/* Gift Items */}
              <div style={styles.giftsRow}>
                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_ROSE,
                      "Rose",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_ROSE].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>🌹</span>
                  <span style={styles.giftName}>Rose</span>
                  <span style={styles.giftPrice}>$1</span>
                </button>

                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_DIAMOND,
                      "Diamond",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_DIAMOND].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>💎</span>
                  <span style={styles.giftName}>Diamond</span>
                  <span style={styles.giftPrice}>$5</span>
                </button>

                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_CROWN,
                      "Crown",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_CROWN].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>👑</span>
                  <span style={styles.giftName}>Crown</span>
                  <span style={styles.giftPrice}>$10</span>
                </button>
              </div>

              <div style={styles.giftsRow}>
                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_BOX,
                      "Gift Box",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_BOX].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>🎁</span>
                  <span style={styles.giftName}>Gift Box</span>
                  <span style={styles.giftPrice}>$3</span>
                </button>

                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_CAR,
                      "Car",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_CAR].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>🚗</span>
                  <span style={styles.giftName}>Car</span>
                  <span style={styles.giftPrice}>$20</span>
                </button>

                <button
                  style={styles.giftItem}
                  onClick={() =>
                    handleGiftPurchase(
                      PRODUCT_IDS.GIFT_HOUSE,
                      "House",
                      GIFT_METADATA[PRODUCT_IDS.GIFT_HOUSE].price,
                    )
                  }
                >
                  <span style={styles.giftIcon}>🏠</span>
                  <span style={styles.giftName}>House</span>
                  <span style={styles.giftPrice}>$50</span>
                </button>
              </div>

              {/* Sponsor and Donate Buttons */}
              <div style={styles.actionButtons}>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: fontSize.md,
                      fontWeight: "600",
                      marginBottom: spacing.sm,
                      textAlign: "center",
                    }}
                  >
                    Sponsor
                  </span>
                  <div style={{ gap: spacing.sm }}>
                    <button
                      style={styles.sponsorButton}
                      onClick={() => handleSponsor(1)}
                    >
                      <IoStar />
                      <span style={styles.sponsorButtonText}>$5</span>
                    </button>
                    <button
                      style={styles.sponsorButton}
                      onClick={() => handleSponsor(2)}
                    >
                      <IoStar />
                      <span style={styles.sponsorButtonText}>$10</span>
                    </button>
                    <button
                      style={styles.sponsorButton}
                      onClick={() => handleSponsor(3)}
                    >
                      <IoStar />
                      <span style={styles.sponsorButtonText}>$25</span>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: fontSize.md,
                      fontWeight: "600",
                      marginBottom: spacing.sm,
                      textAlign: "center",
                    }}
                  >
                    Donate
                  </span>
                  <div style={{ gap: spacing.sm }}>
                    <button
                      style={styles.donateButton}
                      onClick={() => handleDonate(1)}
                    >
                      <AiOutlineCheck />
                      <span style={styles.donateButtonText}>$5</span>
                    </button>
                    <button
                      style={styles.donateButton}
                      onClick={() => handleDonate(2)}
                    >
                      <AiOutlineCheck />
                      <span style={styles.donateButtonText}>$10</span>
                    </button>
                    <button
                      style={styles.donateButton}
                      onClick={() => handleDonate(3)}
                    >
                      <AiOutlineCheck />
                      <span style={styles.donateButtonText}>$25</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
                    )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
  },
  permissionText: {
    color: "#fff",
    textAlign: "center",
    fontSize: fontSize.base,
    marginTop: height / 2 - 50,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    alignSelf: "center",
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  topBar: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.base,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: spacing.sm,
    borderRadius: radius.xl2,
    marginTop: spacing.xl3,
  },
  liveInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 50,
    marginRight: 115,
  },
  liveTag: {
    borderColor: "green",
    borderWidth: 1,
    color: "#fff",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.lg,
    fontSize: fontSize.md,
    fontWeight: "bold",
  },
  viewersContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: "green",
    borderWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl2,
  },
  viewersText: {
    color: "#fff",
    fontSize: fontSize.md,
  },
  endBtn: {
    position: "absolute",
    top: 25,
    right: 20,
    marginTop: spacing.xl3,
    padding: spacing.sm,
    borderWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.xl2,
    borderColor: "red",
    minWidth: 70,
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  endBtnDisabled: {
    backgroundColor: "rgba(128,128,128,0.8)",
    borderColor: "#888",
  },
  viewersModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl3,
    maxHeight: height * 0.7,
  },
  viewersList: {
    maxHeight: height * 0.5,
  },
  viewerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  viewerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: spacing.md,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerName: {
    fontSize: fontSize.md2,
    fontWeight: "500",
    color: "#333",
    marginBottom: spacing.px,
  },
  viewerUsername: {
    fontSize: fontSize.sm2,
    color: "#666",
  },
  emptyViewers: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl5,
    paddingBottom: spacing.xl5,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: "#999",
    marginTop: spacing.md,
  },
  minimizeButton: {
    position: "absolute",
    top: 20,
    right: 114,
    marginTop: spacing.xl3,
    padding: spacing.md,
    borderColor: "white",
    borderWidth: 1,
    borderRadius: radius.full,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingHeart: {
    position: "absolute",
    bottom: 60,
    right: 30,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  giftsModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl3,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: "#333",
  },
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  balanceText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#333",
  },
  topUpLink: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: "#00BFFF",
    borderRadius: radius.sm,
  },
  topUpLinkText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  insufficientBalanceWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "#FFF3F3",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0E0",
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm2,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  giftsGrid: {
    padding: spacing.lg,
    flexGrow: 0,
  },
  giftsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  giftItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: spacing.base,
    borderRadius: radius.lg,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    borderWidth: 2,
    borderColor: "transparent",
  },
  giftIcon: {
    fontSize: fontSize.xl6,
    marginBottom: spacing.sm,
  },
  giftName: {
    fontSize: fontSize.md,
    fontWeight: "500",
    color: "#333",
    marginBottom: spacing.xs,
  },
  giftPrice: {
    fontSize: fontSize.sm,
    color: "#00BFFF",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.base,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sponsorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  sponsorButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  donateButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  flipButton: {
    position: "absolute",
    top: 21,
    right: 160,
    marginTop: spacing.xl3,
    padding: spacing.sm,
    borderColor: "white",
    borderWidth: 1,
    borderRadius: radius.full,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtn: {
    position: "absolute",
    bottom: 220,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.full,
  },
  telegramIcon: {
    marginLeft: spacing.sm,
  },
  commentList: {
    position: "absolute",
    bottom: 80,
    left: 20,
    maxHeight: 120,
    width: "70%",
  },
  comment: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl2,
    marginBottom: spacing.sm,
  },
  messageBox: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 100,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.full,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    height: 50,
    color: "#fff",
    fontSize: fontSize.base,
  },
  likes: {
    position: "absolute",
    bottom: 20,
    right: 20,
    alignItems: "center",
  },
  webCameraPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  webCameraText: {
    color: "#999",
    fontSize: fontSize.lg,
    fontWeight: "500",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  webCameraSubText: {
    color: "#666",
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: "center",
  },
};
