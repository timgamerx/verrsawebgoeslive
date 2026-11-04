// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack, IoHeart, IoEye, IoStop } from "react-icons/io5";
import { useCommunityLive } from "../../../hooks/useCommunityLive";
import LiveTiles from "../../../components/LiveTiles";
import LiveChat from "../../../components/LiveChat";

/** Community live room (web): watch or host a stream, chat and send likes. */
export default function CommunityLiveWeb() {
  const router = useRouter();
  const communityId =
    typeof router.query.communityId === "string" ? router.query.communityId : undefined;
  const live = useCommunityLive(communityId);
  const [selected, setSelected] = useState<number | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);

  const like = () => {
    live.sendLike();
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 2500);
  };

  const confirmEnd = async () => {
    if (!window.confirm("Are you sure you want to end the live stream?")) return;
    await live.endLive();
    router.back();
  };

  if (live.ended) {
    return (
      <div style={s.endedWrap}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>This live has ended</div>
        <button onClick={() => router.push(`/community/${communityId}`)} style={s.primary}>
          Back to community
        </button>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <LiveTiles
        localRef={live.localRef}
        isOwner={live.isOwner}
        remoteUsers={live.remoteUsers}
        selected={selected}
        setSelected={setSelected}
      />

      <div style={s.top}>
        <button onClick={() => router.back()} style={s.round}>
          <IoArrowBack size={20} />
        </button>
        <div style={s.badge}>
          <span style={s.dot} /> LIVE
        </div>
        <div style={s.stat}>
          <IoEye size={16} /> {live.viewerCount}
        </div>
        <div style={{ flex: 1 }} />
        {live.isOwner && (
          <button onClick={confirmEnd} style={{ ...s.round, background: "#FF3B30" }} title="End live">
            <IoStop size={18} />
          </button>
        )}
      </div>

      <div style={s.titleBar}>{live.community?.name}</div>

      <div style={s.likeWrap}>
        {hearts.map((h) => (
          <IoHeart key={h} size={28} color="#FF3B5C" style={s.heart} />
        ))}
        <button onClick={like} style={s.likeBtn}>
          <IoHeart size={26} color="#FF3B5C" />
        </button>
        <div style={{ color: "#fff", fontSize: 13, marginTop: 4 }}>{live.likeCount} likes</div>
      </div>

      <LiveChat comments={live.comments} onSend={live.sendComment} />

      <style>{`
        @keyframes floatUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-260px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { position: "fixed", inset: 0, background: "#000", overflow: "hidden" },
  endedWrap: {
    minHeight: "100vh", background: "#000", color: "#fff", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
  },
  primary: {
    background: "#00BFFF", color: "#fff", border: "none", borderRadius: 999,
    padding: "12px 28px", fontWeight: 600, fontSize: 15, cursor: "pointer",
  },
  top: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, display: "flex",
    alignItems: "center", gap: 10, padding: 14,
  },
  round: {
    width: 40, height: 40, borderRadius: 20, border: "none", color: "#fff",
    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", padding: 0,
  },
  badge: {
    display: "flex", alignItems: "center", gap: 6, background: "#FF3B30", color: "#fff",
    borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 700,
  },
  dot: { width: 8, height: 8, borderRadius: 4, background: "#fff" },
  stat: {
    display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.55)",
    color: "#fff", borderRadius: 14, padding: "5px 12px", fontSize: 13,
  },
  titleBar: {
    position: "absolute", top: 64, left: 16, zIndex: 6, color: "#fff", fontSize: 16, fontWeight: 600,
    textShadow: "0 1px 4px rgba(0,0,0,0.7)",
  },
  likeWrap: {
    position: "absolute", right: 16, bottom: 90, zIndex: 6, display: "flex",
    flexDirection: "column", alignItems: "center",
  },
  likeBtn: {
    width: 50, height: 50, borderRadius: 25, border: "none", cursor: "pointer",
    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: 0,
  },
  heart: { position: "absolute", bottom: 40, animation: "floatUp 2.4s ease-out forwards" },
};
