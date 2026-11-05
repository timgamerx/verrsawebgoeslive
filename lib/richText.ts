// Parses the lightweight markers used in newsletter bodies (same rules as the
// send-custom-email edge function): **bold**, *italic*, _italic_, "- " bullets,
// "1. " numbered lists and new lines.

export type Segment = { text: string; bold?: boolean; italic?: boolean };
export type Line =
  | { type: "blank" }
  | { type: "p"; segments: Segment[] }
  | { type: "li"; ordered: boolean; marker: string; segments: Segment[] };

const INLINE =
  /\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*(?![\s*])(.+?)(?<!\s)\*(?![\w*])|(?<![\w_])_(?![\s_])(.+?)(?<!\s)_(?![\w_])/g;

export function parseInline(input: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  INLINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE.exec(input))) {
    if (m.index > last) out.push({ text: input.slice(last, m.index) });
    const bold = m[1] ?? m[2];
    if (bold !== undefined) out.push({ text: bold, bold: true });
    else out.push({ text: m[3] ?? m[4], italic: true });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

export function parseBody(body: string): Line[] {
  const lines = (body || "").replace(/\r\n?/g, "\n").trim().split("\n");
  let n = 0;
  return lines.map((line): Line => {
    if (!line.trim()) {
      n = 0;
      return { type: "blank" };
    }
    const bullet = line.match(/^\s*(?:[-*•–·])\s+(.*)$/);
    if (bullet) {
      n = 0;
      return { type: "li", ordered: false, marker: "•", segments: parseInline(bullet[1]) };
    }
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (num) {
      n += 1;
      return { type: "li", ordered: true, marker: `${n}.`, segments: parseInline(num[1]) };
    }
    n = 0;
    return { type: "p", segments: parseInline(line) };
  });
}

/** Plain text with markers removed — for list previews. */
export function stripMarkers(body: string): string {
  return parseBody(body)
    .map((l) => (l.type === "blank" ? "" : l.segments.map((s) => s.text).join("")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
