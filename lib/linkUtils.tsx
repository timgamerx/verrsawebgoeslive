// @ts-nocheck
import React from "react";

/**
 * Renders text with clickable links for web.
 * Replaces URLs and @mentions in the text.
 */
export function renderTextWithLinks(
  text: string,
  onMentionPress?: (username: string) => void,
  style?: React.CSSProperties
): React.ReactNode {
  if (!text) return null;

  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const MENTION_REGEX = /@(\w+)/g;

  // Split by URLs and mentions
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const combined = new RegExp(`${URL_REGEX.source}|${MENTION_REGEX.source}`, "g");
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} style={style}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    if (match[1]) {
      // URL
      parts.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#3B82F6", textDecoration: "underline" }}
        >
          {match[1]}
        </a>
      );
    } else if (match[2]) {
      // Mention
      parts.push(
        <span
          key={match.index}
          style={{ color: "#3B82F6", cursor: onMentionPress ? "pointer" : "default" }}
          onClick={() => onMentionPress && onMentionPress(match[2])}
        >
          @{match[2]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} style={style}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}
