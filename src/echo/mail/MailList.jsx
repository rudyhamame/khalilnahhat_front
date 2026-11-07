import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  Paperclip,
  Search,
  X,
} from "lucide-react";
import { dateLabel, listDate, PAGE_SIZE } from "./mailPresentation";
export default function MailList({ mail }) {
  const {
    folders,
    folder,
    query,
    setQuery,
    loading,
    items,
    listError,
    selected,
    open,
    start,
    page,
    refresh,
  } = mail;
  const name = folders.find((item) => item.id === folder)?.name || "Messages";
  return (
    <section className="ae-messages" aria-label={`${name} messages`}>
      <div className="ae-list-head">
        <div>
          <h2>{name}</h2>
          <span>
            {query
              ? "Search results"
              : `${folders.find((item) => item.id === folder)?.total || 0} messages`}
          </span>
        </div>
        <label className="ae-search">
          <Search size={16} />
          <span className="ae-sr">Search this folder</span>
          <input
            type="search"
            placeholder="Search this folder"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="ae-icon-button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={13} />
            </button>
          )}
        </label>
      </div>
      {folder === "4" && (
        <p className="ae-folder-note">
          These messages were submitted without a final confirmation. Review
          them before sending another copy.
        </p>
      )}
      {listError && (
        <div className="ae-alert" role="alert">
          <p>{listError}</p>
          <button type="button" onClick={refresh}>
            Retry loading
          </button>
        </div>
      )}
      <div className="ae-message-list" aria-busy={loading}>
        {loading ? (
          <div className="ae-empty" role="status">
            <span className="ae-spinner" />
            <p>Loading messages…</p>
          </div>
        ) : items.length ? (
          items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${selected?.id === item.id ? "is-selected " : ""}${!item.read ? "is-unread" : ""}`}
              aria-current={selected?.id === item.id ? "true" : undefined}
              onClick={() => open(item)}
            >
              <span className="ae-message-meta">
                <strong>
                  {folder === "2" ? item.to : item.sender || item.from}
                </strong>
                <time title={dateLabel(item.time)}>{listDate(item.time)}</time>
              </span>
              <span className="ae-message-subject">
                {!item.read && <i aria-label="Unread" />}
                <strong>{item.subject}</strong>
                {item.attachments && (
                  <Paperclip size={13} aria-label="Has attachments" />
                )}
              </span>
              <span className="ae-summary">
                {item.summary || "(No message text)"}
              </span>
              {["pending", "uncertain"].includes(item.state) && (
                <span className="ae-send-state">
                  {item.state === "pending"
                    ? "Sending or awaiting confirmation"
                    : "Sending not confirmed"}
                </span>
              )}
            </button>
          ))
        ) : (
          !listError && (
            <div className="ae-empty">
              <Inbox size={30} />
              <h3>{query ? "No matching messages" : "This folder is empty"}</h3>
              <p>
                {query
                  ? "Try another name, address, or word."
                  : folder === "1"
                    ? "Customer emails will appear here."
                    : "Messages you move here will appear in this folder."}
              </p>
            </div>
          )
        )}
      </div>
      <footer className="ae-pagination">
        <button
          type="button"
          className="ae-icon-button"
          aria-label="Previous messages"
          disabled={start === 1 || loading}
          onClick={() => page(Math.max(1, start - PAGE_SIZE))}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          {items.length ? `${start}–${start + items.length - 1}` : "0 messages"}
        </span>
        <button
          type="button"
          className="ae-icon-button"
          aria-label="Next messages"
          disabled={items.length < PAGE_SIZE || loading}
          onClick={() => page(start + PAGE_SIZE)}
        >
          <ArrowRight size={16} />
        </button>
      </footer>
    </section>
  );
}
