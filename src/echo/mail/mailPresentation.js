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
