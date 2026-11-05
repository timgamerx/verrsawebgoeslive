// Converts clipboard HTML (Word, Google Docs, web pages) into the plain-text
// markers the send-custom-email function renders: **bold**, *italic*, "- " bullets, new lines.
export function htmlToMarkers(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const style = (el.getAttribute("style") || "").toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");

    const isBold =
      tag === "b" ||
      tag === "strong" ||
      /font-weight:\s*(bold|[6-9]00)/.test(style);
    const isItalic = tag === "i" || tag === "em" || /font-style:\s*italic/.test(style);

    if (tag === "br") return "\n";
    if (tag === "li") {
      const parent = el.parentElement?.tagName.toLowerCase();
      let prefix = "- ";
      if (parent === "ol") {
        const idx = Array.from(el.parentElement!.children).indexOf(el) + 1;
        prefix = `${idx}. `;
      }
      return `${prefix}${inner.trim()}\n`;
    }
    if (tag === "ul" || tag === "ol") return `\n${inner}\n`;
    if (/^(p|div|h[1-6]|tr)$/.test(tag)) return `${inner.trim()}\n`;

    let result = inner;
    if (inner.trim()) {
      const lead = inner.match(/^\s*/)![0];
      const trail = inner.match(/\s*$/)![0];
      let core = inner.trim();
      if (isItalic) core = `*${core}*`;
      if (isBold) core = `**${core}**`;
      result = lead + core + trail;
    }
    return result;
  };

  return walk(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
