// @ts-nocheck
import React, { useEffect, useRef } from "react";

/** One remote broadcaster's video, played into a div. */
function RemoteTile({ user, onClick, fullscreen }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && user.videoTrack) user.videoTrack.play(ref.current);
    return () => user.videoTrack?.stop();
  }, [user, user.videoTrack]);
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background: "#111",
        borderRadius: fullscreen ? 0 : 10,
        overflow: "hidden",
        cursor: "pointer",
        minHeight: 0,
      }}
    >
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

/**
 * Up to six tiles (like mobile's split screen). Tap a tile for fullscreen;
 * tap again (or the minimize button) to go back.
 */
export default function LiveTiles({ localRef, isOwner, remoteUsers, selected, setSelected }) {
  const remotes = remoteUsers.filter((u) => u.videoTrack).slice(0, 6);
  const count = remotes.length + (isOwner ? 1 : 0);
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(count / cols));

  if (selected !== null && remotes.find((u) => u.uid === selected)) {
    const u = remotes.find((x) => x.uid === selected);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div style={{ flex: 1, display: "flex" }}>
          <RemoteTile user={u} fullscreen onClick={() => setSelected(null)} />
          <button onClick={() => setSelected(null)} style={mini}>⤡</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gap: 4,
        padding: 4,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {isOwner && (
        <div style={{ position: "relative", background: "#111", borderRadius: 10, overflow: "hidden" }}>
          <div ref={localRef} style={{ position: "absolute", inset: 0 }} />
        </div>
      )}
      {remotes.map((u) => (
        <RemoteTile key={u.uid} user={u} onClick={() => setSelected(u.uid)} />
      ))}
      {count === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
          Waiting for the host to start streaming…
        </div>
      )}
    </div>
  );
}

const mini = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "none",
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  fontSize: 20,
  cursor: "pointer",
  zIndex: 5,
};
