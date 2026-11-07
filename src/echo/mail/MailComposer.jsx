import { useEffect, useRef } from "react";
import { Send, Trash2, X } from "lucide-react";
import { BOOKINGS, hasContent } from "./mailPresentation";

export default function MailComposer({ composer, onReview }) {
  const dialog = useRef(null);
  const { draft, open, sending, error, edit, close, discard, send } = composer;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  if (!draft) return null;
  const locked = sending || draft.submitted;
  return (
    <dialog
      ref={dialog}
      className="ae-composer"
      aria-labelledby="mail-compose-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form onSubmit={send}>
        <header>
          <div>
            <span className="ae-eyebrow">
              {draft.replyMessageId ? "CONVERSATION" : "BOOKINGS"}
            </span>
            <h2 id="mail-compose-title">
              {draft.replyMessageId ? "Reply to email" : "New email"}
            </h2>
          </div>
          <button
            type="button"
            className="ae-icon-button"
            aria-label="Keep draft and close"
            onClick={close}
            disabled={sending}
          >
            <X size={19} />
          </button>
        </header>
        <p className="ae-from">
          From <strong>{BOOKINGS}</strong>
        </p>
        <div className="ae-compose-fields">
          <label>
            To
            <input
              autoFocus
              type="email"
              multiple
              required
              maxLength={3000}
              value={draft.to}
              onChange={(event) => edit("to", event.target.value)}
              disabled={locked}
              placeholder="customer@example.com"
            />
          </label>
          <label>
            Cc
            <input
              type="email"
              multiple
              maxLength={3000}
              value={draft.cc}
              onChange={(event) => edit("cc", event.target.value)}
              disabled={locked}
              placeholder="Optional"
            />
          </label>
          <label>
            Subject
            <input
              required
              maxLength={250}
              value={draft.subject}
              onChange={(event) => edit("subject", event.target.value)}
              disabled={locked}
            />
          </label>
        </div>
        <label className="ae-compose-message">
          <span className="ae-sr">Message</span>
          <textarea
            required
            maxLength={50000}
            value={draft.text}
            onChange={(event) => edit("text", event.target.value)}
            disabled={locked}
            placeholder="Write your message…"
          />
        </label>
        {error && (
          <div className="ae-alert" role="alert">
            <p>{error}</p>
            {draft.submitted && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onReview();
                }}
              >
                Review Needs attention
              </button>
            )}
          </div>
        )}
        {!error && draft.submitted && !sending && (
          <div className="ae-alert" role="alert">
            This draft was submitted earlier. Review Sent and Needs attention
            before creating another copy.
            <button
              type="button"
              onClick={() => {
                close();
                onReview();
              }}
            >
              Review messages
            </button>
          </div>
        )}
        <footer>
          <div className="ae-compose-secondary">
            <button
              type="button"
              className="ae-icon-button"
              aria-label="Discard draft"
              onClick={discard}
              disabled={sending}
            >
              <Trash2 size={16} />
            </button>
            <span>
              {sending
                ? "Waiting for confirmation…"
                : hasContent(draft)
                  ? "Draft kept in this browser tab"
                  : "Replies return to your bookings inbox"}
            </span>
          </div>
          <button className="ae-primary" type="submit" disabled={locked}>
            <Send size={16} />
            {sending ? "Sending…" : "Send email"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
