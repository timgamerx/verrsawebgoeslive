// @ts-nocheck
import React from "react";

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

const toUrl = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

/** Warns the user they are leaving Verrsa, then opens the link in a new tab. */
export const confirmOpenExternalLink = (rawUrl: string) => {
  const url = toUrl(rawUrl);
  if (
    window.confirm(
      `You're leaving Verrsa to an external website.\n\n${url}\n\nContinue?`,
    )
  ) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

/** Splits text into plain strings and clickable links (with a safety prompt). */
export const linkifyText = (text: string, keyPrefix = "link"): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, "gi");

  while ((match = regex.exec(text)) !== null) {
    let url = match[0];
    const trailing = url.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    if (trailing) url = url.slice(0, -trailing.length);

    if (match.index > lastIndex) nodes.push(text.substring(lastIndex, match.index));

    nodes.push(
      <a
        key={`${keyPrefix}-${match.index}`}
        href={toUrl(url)}
        onClick={(e) => {
          e.preventDefault();
          confirmOpenExternalLink(url);
        }}
        style={{ color: "#00BFFF", textDecoration: "underline", cursor: "pointer", wordBreak: "break-all" }}
      >
        {url}
      </a>,
    );

    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.substring(lastIndex));
  return nodes;
};
