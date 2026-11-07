import { Inbox, Mail, PenLine, RefreshCw } from "lucide-react";
import { useMailbox } from "./mail/useMailbox";
import { useMailboxDraft } from "./mail/useMailboxDraft";
import { BOOKINGS, hasContent } from "./mail/mailPresentation";
import MailFolders from "./mail/MailFolders";
import MailList from "./mail/MailList";
import MailReader from "./mail/MailReader";
import MailComposer from "./mail/MailComposer";
import "./adminEmail.css";

function EmailWorkspace({ token, user }) {
  const mail = useMailbox(token);
  const composer = useMailboxDraft({
    owner: user?.id || user?._id || user?.email,
    api: mail.api,
    onSent: mail.sent,
  });
  const ready = Boolean(mail.status?.configured && mail.folders.length);
  const canSend = ready && (mail.status?.sendingConfigured ?? true);
  const statuses = [
    [mail.status?.configured, "Receiving"],
    [mail.status?.sendingConfigured ?? ready, "Replies"],
    [mail.status?.automation?.configured, "Automated emails"],
  ];
  return (
    <section className="admin-email" aria-label="Email">
      <header className="ae-header">
        <div className="ae-title">
          <span className="ae-mail-mark">
            <Mail size={22} />
          </span>
          <div>
            <h1>Bookings inbox</h1>
            <p>{BOOKINGS}</p>
          </div>
        </div>
        <div className="ae-actions">
          <button
            type="button"
            className="ae-icon-button"
            aria-label="Refresh mailbox"
            title="Refresh mailbox"
            onClick={mail.refresh}
            disabled={mail.connecting || mail.loading}
          >
            <RefreshCw
              size={17}
              className={mail.connecting || mail.loading ? "ae-spin" : ""}
            />
          </button>
          <button
            type="button"
            className="ae-primary"
            onClick={() => composer.compose()}
            disabled={!canSend}
          >
            <PenLine size={16} />
            {hasContent(composer.draft) ? "Open draft" : "Compose"}
          </button>
        </div>
      </header>
      <div className="ae-status-bar">
        <div>
          {statuses.map(([on, name]) => (
            <span key={name} className={on ? "ae-connected" : ""}>
              <i />
              {name}
              <span className="ae-sr"> {on ? "enabled" : "not connected"}</span>
            </span>
          ))}
        </div>
        <span className="ae-automation-address">
          noreply@djkhalilnahhat.ca · automated mail
        </span>
      </div>
      {mail.connectionError && (
        <div className="ae-alert ae-global-alert" role="alert">
          <p>{mail.connectionError}</p>
          <button type="button" onClick={mail.refresh}>
            Reconnect
          </button>
        </div>
      )}
      {mail.notice && (
        <p className="ae-notice" role="status">
          {mail.notice}
        </p>
      )}
      {!mail.status && mail.connecting ? (
        <div className="ae-connecting" role="status">
          <span className="ae-spinner" />
          <p>Connecting to your inbox…</p>
        </div>
      ) : mail.status && !mail.status.configured ? (
        <div className="ae-setup">
          <Inbox size={40} />
          <h2>Connect your bookings inbox</h2>
          <p>
            Finish domain email setup to receive customer messages and reply
            from {BOOKINGS}.
          </p>
          <a
            href={mail.status.setupUrl || "https://dash.cloudflare.com/"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open email setup
          </a>
          <button type="button" onClick={mail.refresh}>
            Check connection
          </button>
        </div>
      ) : ready ? (
        <div
          className={`ae-workspace${mail.selected ? " ae-has-selection" : ""}`}
        >
          <MailFolders mail={mail} composer={composer} />
          <MailList mail={mail} />
          <MailReader
            mail={mail}
            canSend={canSend}
            onReply={(item) => composer.compose(item)}
          />
        </div>
      ) : (
        !mail.connecting && (
          <div className="ae-connecting">
            <Inbox size={32} />
            <p>Your mailbox could not be loaded.</p>
            <button type="button" onClick={mail.refresh}>
              Try again
            </button>
          </div>
        )
      )}
      <MailComposer
        composer={composer}
        onReview={() => mail.chooseFolder("4")}
      />
    </section>
  );
}
// A different session unmounts every pending request and reader before displaying another administrator's draft.
export default function AdminEmail(props) {
  return <EmailWorkspace key={props.token} {...props} />;
}
