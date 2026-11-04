// @ts-nocheck
// Web voice notes: MediaRecorder capture + the same AES-GCM voice format as mobile
// (files: `...enc2` / `..._e<epoch>.enc2` in the private media bucket).
import { supabase } from "../components/supabase";
import { generateSharedKey } from "./encryption";
import {
  deriveCommunityKey,
  encryptBytesV2,
  decryptBytesV2,
} from "./aesGcm";

export const VOICE_BUCKET = "media-private";

export const isEncryptedAudioUrl = (url: string) =>
  /\.enc2?$/.test(url.split("?")[0]);

/** Signed URL for a private storage path (full URLs pass through). */
export const resolveVoiceUrl = async (pathOrUrl: string, expires = 300) => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUrl(pathOrUrl, expires);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

/**
 * Upload a recorded voice note. `key` is the AES key (Uint8Array); `epoch` tags
 * community group-key notes so old notes stay readable after a key rotation.
 */
export const uploadVoiceMessage = async (
  blob: Blob,
  userId: string,
  folder: "chat-audio" | "community-chat-audio",
  scopeId: string,
  key: Uint8Array,
  epoch?: number | null,
) => {
  try {
    const payload = await encryptBytesV2(new Uint8Array(await blob.arrayBuffer()), key);
    const ext = epoch ? `e${epoch}.enc2` : "enc2";
    const path = `${folder}/${scopeId}/${userId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(path, payload, { contentType: "application/octet-stream", upsert: false });
    if (error) throw error;
    return data.path;
  } catch (e) {
    console.error("Voice upload failed:", e);
    return null;
  }
};

/** Download + decrypt a voice note; returns a blob URL playable in <audio>. */
export const downloadAndDecryptAudio = async (
  url: string,
  keys: { epochKeys?: Record<number, Uint8Array>; dmKey?: Uint8Array | null },
) => {
  try {
    const signed = await resolveVoiceUrl(url);
    if (!signed) return null;
    const encrypted = new Uint8Array(await (await fetch(signed)).arrayBuffer());
    const m = url.split("?")[0].match(/_?e(\d+)\.enc2$/);
    const key = m ? keys.epochKeys?.[Number(m[1])] : (keys.epochKeys?.[0] ?? keys.dmKey);
    if (!key) return null;
    const plain = await decryptBytesV2(encrypted, key);
    return URL.createObjectURL(new Blob([plain], { type: "audio/mp4" }));
  } catch (e) {
    console.warn("Voice note could not be decrypted:", (e as any)?.name);
    return null;
  }
};

export { deriveCommunityKey, generateSharedKey };

/** Minimal recorder around MediaRecorder. */
export const createVoiceRecorder = () => {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;

  const release = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      startedAt = Date.now();
      recorder.start();
    },
    stop(): Promise<{ blob: Blob; duration: number } | null> {
      return new Promise((resolve) => {
        if (!recorder) return resolve(null);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
          const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          release();
          recorder = null;
          resolve(blob.size ? { blob, duration } : null);
        };
        recorder.stop();
      });
    },
    cancel() {
      if (recorder) recorder.onstop = () => {};
      try { recorder?.stop(); } catch {}
      release();
      recorder = null;
    },
  };
};
