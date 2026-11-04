// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";

/** Comment stream + input overlay (last 7 messages, like mobile). */
export default function LiveChat({ comments, onSend }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, zIndex: 4 }}>
      <div style={{ maxHeight: 220, overflowY: "auto", maxWidth: 420, marginBottom: 8 }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 6,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 14,
              padding: "6px 10px",
              color: "#fff",
              fontSize: 14,
              width: "fit-content",
              maxWidth: "100%",
            }}
          >
            <img
              src={c.profiles?.avatar_url || "/avatar.jpg"}
              alt=""
              style={{ width: 24, height: 24, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
            />
            <div>
              <b style={{ fontWeight: 600 }}>
                {c.profiles?.full_name || c.profiles?.username || "User"}
              </b>{" "}
              {c.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 520 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment…"
          style={{
            flex: 1,
            padding: "11px 16px",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.4)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            outline: "none",
            fontSize: 15,
          }}
        />
        <button
          onClick={submit}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            border: "none",
            background: "#00BFFF",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <IoSend size={18} />
        </button>
      </div>
    </div>
  );
}
