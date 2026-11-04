// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { IoPlay, IoPause } from "react-icons/io5";
import { downloadAndDecryptAudio } from "../lib/voiceMessages";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Voice note bubble: decrypts the note then plays it (same look as mobile). */
export function VoiceBubble({ url, duration = 0, isOwn, textColor, keys }) {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const color = textColor || (isOwn ? "#fff" : "#111");
  const track = isOwn ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.15)";

  useEffect(() => {
    let cancelled = false;
    downloadAndDecryptAudio(url, keys).then((u) => !cancelled && setSrc(u));
    return () => {
      cancelled = true;
    };
  }, [url, keys]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  };

  const total = audioRef.current?.duration || duration || 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
      <button
        onClick={toggle}
        disabled={!src}
        style={{ background: "none", border: "none", cursor: src ? "pointer" : "default", padding: 0, opacity: src ? 1 : 0.5 }}
      >
        {playing ? <IoPause size={26} color={color} /> : <IoPlay size={26} color={color} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, borderRadius: 2, backgroundColor: track }}>
          <div style={{ height: 4, borderRadius: 2, width: `${progress * 100}%`, backgroundColor: color }} />
        </div>
        <div style={{ fontSize: 11, marginTop: 3, color }}>
          {fmt(playing || current ? current : total)}
        </div>
      </div>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        />
      )}
    </div>
  );
}
