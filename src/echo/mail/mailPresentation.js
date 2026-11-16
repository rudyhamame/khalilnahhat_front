import {uuid} from '../../lib/uuid.js';
export const BOOKINGS = "bookings@djkhalilnahhat.ca";
export const PAGE_SIZE = 50;
export const newDraft = () => ({
  to: "",
  cc: "",
  subject: "",
  text: "",
  requestId: uuid(),
  submitted: false,
});
export const addresses = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
export const firstAddress = (value) =>
  value?.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ||
  "";
export const replyTarget = (item) =>
  item?.from?.toLowerCase() === BOOKINGS
    ? firstAddress(item.to)
    : firstAddress(item?.replyTo || item?.from);
export const hasContent = (draft) =>
  Boolean(draft && (draft.to || draft.cc || draft.subject || draft.text));
const fullDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
export const dateLabel = (value) =>
  value && Number.isFinite(Number(value)) ? fullDate.format(Number(value)) : "";
export const listDate = (value) =>
  value && Number.isFinite(Number(value))
    ? shortDate.format(Number(value))
    : "";
export const sizeLabel = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil((bytes || 0) / 1024))} KB`;
export function linkedText(value = "") {
  const parts = [], pattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) parts.push({ text: value.slice(cursor, match.index) });
    const raw = match[0];
    let label = raw.replace(/[.,!?;:]+$/, "");
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (label.endsWith(close) && label.split(close).length > label.split(open).length) label = label.slice(0, -1);
    }
    const href = label.toLowerCase().startsWith("www.") ? `https://${label}` : label;
    try {
      const url = new URL(href);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported link");
      parts.push({ text: label, href: url.href });
    } catch {
      parts.push({ text: label });
    }
    if (label.length < raw.length) parts.push({ text: raw.slice(label.length) });
    cursor = match.index + raw.length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts;
}
export function emailBodyBlocks(value = "") {
  const blocks = [], lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  let current = null;
  const flush = () => {
    if (current?.lines.length) blocks.push(current);
    current = null;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^--\s*$/.test(line)) {
      flush();
      const signature = lines.slice(index + 1).join("\n").trim();
      if (signature) blocks.push({ type: "signature", lines: [signature] });
      break;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    let type = "paragraph", content = line;
    if (/^>\s?/.test(line)) {
      type = "quote";
      content = line.replace(/^>\s?/, "");
    } else if (/^\s*[-*•]\s+/.test(line)) {
      type = "unordered-list";
      content = line.replace(/^\s*[-*•]\s+/, "");
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      type = "ordered-list";
      content = line.replace(/^\s*\d+[.)]\s+/, "");
    }
    if (current?.type !== type) {
      flush();
      current = { type, lines: [] };
    }
    current.lines.push(content);
  }
  flush();
  return blocks.length ? blocks : [{ type: "paragraph", lines: ["(This message has no text content.)"] }];
}
export function replyDraft(item) {
  return {
    ...newDraft(),
    to: replyTarget(item),
    subject: /^re:/i.test(item.subject)
      ? item.subject
      : `Re: ${item.subject || "(No subject)"}`,
    replyMessageId: item.id,
  };
}
export function sendPayload(draft) {
  return {
    requestId: draft.requestId,
    to: addresses(draft.to),
    cc: addresses(draft.cc),
    subject: draft.subject,
    text: draft.text,
    ...(draft.replyMessageId ? { replyMessageId: draft.replyMessageId } : {}),
  };
}
