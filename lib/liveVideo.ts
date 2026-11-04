// @ts-nocheck
// Agora Web video for community live. Same App ID + channel naming as the mobile
// app, so web and phone viewers share one stream.
const AGORA_APP_ID =
  process.env.NEXT_PUBLIC_AGORA_APP_ID || "024c458adbf94a5687afc0672e7a6120";

export const liveChannelName = (communityId: string) =>
  `community-live-${communityId}`;

export interface LiveVideo {
  client: any;
  tracks: any[];
}

/**
 * Joins the channel. Owners publish camera + mic into `localEl`; viewers
 * subscribe. `onRemoteChange` fires with the current list of remote users.
 */
export const joinLiveVideo = async (
  communityId: string,
  owner: boolean,
  localEl: HTMLElement | null,
  onRemoteChange: (users: any[]) => void,
): Promise<LiveVideo | null> => {
  try {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    await client.setClientRole(owner ? "host" : "audience");

    const refresh = () => onRemoteChange([...client.remoteUsers]);
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") user.audioTrack?.play();
      refresh();
    });
    client.on("user-unpublished", refresh);
    client.on("user-left", refresh);

    await client.join(AGORA_APP_ID, liveChannelName(communityId), null, 0);

    const tracks: any[] = [];
    if (owner) {
      const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
      tracks.push(mic, cam);
      if (localEl) cam.play(localEl);
      await client.publish([mic, cam]);
    }
    return { client, tracks };
  } catch (e) {
    console.error("Agora join failed:", e);
    return null;
  }
};

export const leaveLiveVideo = async (video: LiveVideo | null) => {
  if (!video) return;
  video.tracks.forEach((t) => {
    t.stop();
    t.close();
  });
  try {
    await video.client.leave();
  } catch {}
};
