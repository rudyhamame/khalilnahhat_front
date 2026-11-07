import {
  Archive,
  ArrowLeft,
  Download,
  Mail,
  MailOpen,
  Reply,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { dateLabel, replyTarget, sizeLabel } from "./mailPresentation";
export default function MailReader({ mail, onReply, canSend }) {
  const {
    detail,
    selected,
    reading,
    readerError,
    busy,
    close,
    act,
    download,
    status,
  } = mail;
  const trash = detail?.folderId === "3";
  const restoreFolder =
    detail?.previousFolder && detail.previousFolder !== "3"
      ? detail.previousFolder
      : "1";
  const remove = () => {
    if (
      window.confirm(
        "Permanently delete this message and its attachments? This cannot be undone.",
      )
    )
      act("remove");
  };
  return (
    <article
      className="ae-reader"
      aria-label="Message content"
      aria-busy={reading}
    >
      <div className="ae-reader-toolbar">
        <button type="button" className="ae-back" onClick={close}>
          <ArrowLeft size={16} />
          Back to messages
        </button>
        {detail && (
          <div>
            {status.capabilities?.read && (
              <button
                type="button"
                className="ae-icon-button"
                disabled={Boolean(busy)}
                title={detail.read ? "Mark unread" : "Mark read"}
                aria-label={detail.read ? "Mark unread" : "Mark read"}
                onClick={() => act("read", !detail.read)}
              >
                {detail.read ? <Mail size={17} /> : <MailOpen size={17} />}
              </button>
            )}
            {status.capabilities?.move &&
              (trash ? (
                <button
                  type="button"
                  className="ae-icon-button"
                  disabled={Boolean(busy)}
                  title="Restore message"
                  aria-label="Restore message"
                  onClick={() => act("move", restoreFolder)}
                >
                  <RotateCcw size={17} />
                </button>
              ) : (
                <>
                  {detail.folderId !== "5" && detail.state !== "pending" && (
                    <button
                      type="button"
                      className="ae-icon-button"
                      disabled={Boolean(busy)}
                      title="Archive message"
                      aria-label="Archive message"
                      onClick={() => act("move", "5")}
                    >
                      <Archive size={17} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="ae-icon-button"
                    disabled={Boolean(busy) || detail.state === "pending"}
                    title="Move to Trash"
                    aria-label="Move to Trash"
                    onClick={() => act("move", "3")}
                  >
                    <Trash2 size={17} />
                  </button>
                </>
              ))}
            {trash && status.capabilities?.remove && (
              <button
                type="button"
                className="ae-danger"
                disabled={Boolean(busy)}
                onClick={remove}
              >
                Delete permanently
              </button>
            )}
          </div>
        )}
      </div>
      {readerError && (
        <div className="ae-alert" role="alert">
          {readerError}
          {selected && !detail && (
            <button type="button" onClick={() => mail.open(selected)}>
              Retry opening
            </button>
          )}
        </div>
      )}
      {reading && !detail ? (
        <div className="ae-empty" role="status">
          <span className="ae-spinner" />
          <p>Opening email…</p>
        </div>
      ) : detail ? (
        <div className="ae-reader-scroll">
          <header className="ae-message-heading">
            <span className="ae-eyebrow">
              {trash
                ? "TRASH"
                : detail.from === status.mailbox
                  ? "SENT MESSAGE"
                  : "CUSTOMER MESSAGE"}
            </span>
            <div className="ae-title-row">
              <h2>{detail.subject}</h2>
              {!trash && <button type="button" className="ae-primary" onClick={() => onReply(detail)} disabled={!canSend || !replyTarget(detail) || detail.state === "pending"} title="Send from your bookings address"><Reply size={16} />Reply</button>}
            </div>
            <time>{dateLabel(detail.time)}</time>
            <dl>
              <dt>From</dt>
              <dd>{detail.from}</dd>
              <dt>To</dt>
              <dd>{detail.to}</dd>
              {detail.cc && (
                <>
                  <dt>Cc</dt>
                  <dd>{detail.cc}</dd>
                </>
              )}
              {detail.replyTo && detail.replyTo !== detail.from && (
                <>
                  <dt>Reply to</dt>
                  <dd>{detail.replyTo}</dd>
                </>
              )}
            </dl>
          </header>
          <pre className="ae-body">
            {detail.text || "(This message has no text content.)"}
          </pre>
          {detail.attachments.length > 0 && (
            <section className="ae-attachments" aria-label="Attachments">
              <h3>
                Attachments <span>{detail.attachments.length}</span>
              </h3>
              {detail.attachments.map((file) => (
                <button
                  type="button"
                  key={file.id}
                  disabled={Boolean(busy)}
                  onClick={() => download(file)}
                >
                  <Download size={17} />
                  <span>
                    {file.name}
                    <small>{sizeLabel(file.size)}</small>
                  </span>
                </button>
              ))}
            </section>
          )}

        </div>
      ) : (
        !reading &&
        !readerError && (
          <div className="ae-reader-placeholder">
            <Mail size={36} />
            <h2>Your bookings, in one place</h2>
            <p>Choose a message to read, reply, or organize it.</p>
          </div>
        )
      )}
    </article>
  );
}
