import { AlertTriangle, CheckCircle2, Clock3, Inbox, Mail, PenLine, RefreshCw, Send, ShieldCheck } from "lucide-react";
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
  const attention = mail.folders.find((item) => item.type === "Unconfirmed");
  const unread = mail.folders.find((item) => item.type === "Inbox")?.unread || 0;
  const statuses = [
    [mail.status?.receivingConfigured ?? mail.status?.configured, "Inbox", "Receiving customer email", Inbox],
    [mail.status?.sendingConfigured ?? ready, "Sending", `Sending from ${BOOKINGS}`, Send],
    [mail.status?.automation?.configured, "Automation", "Booking notifications", ShieldCheck],
  ];
  const syncLabel = mail.lastCheckedAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(mail.lastCheckedAt)
    : "Not checked yet";
  return (
    <section className="admin-email" aria-label="Email">
      <header className="ae-header">
        <div className="ae-title">
          <span className="ae-mail-mark">
            <Mail size={22} />
          </span>
          <div>
            <h1>Email operations</h1>
            <p>Receive, reply, and verify delivery from {BOOKINGS}</p>
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
      <section className="ae-health" aria-label="Email service health">
        <div className="ae-health-summary"><span className={ready&&canSend?"is-healthy":"is-warning"}>{ready&&canSend?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>}<strong>{ready&&canSend?"Email service operational":"Email service needs attention"}</strong></span><span><Clock3 size={14}/>Last checked {syncLabel}</span></div>
        <div className="ae-health-grid">{statuses.map(([on,name,description,Icon])=><article key={name} className={on?"is-on":"is-off"}><Icon size={17}/><div><strong>{name}</strong><span>{description}</span></div><b>{on?"Connected":"Unavailable"}</b></article>)}</div>
      </section>
      <div className="ae-mailbox-summary" aria-label="Mailbox summary"><span><b>{unread}</b> unread</span><span><b>{attention?.total||0}</b> need attention</span><span>Automated mail: <strong>noreply@djkhalilnahhat.ca</strong></span></div>
      {(attention?.total||0)>0&&<div className="ae-attention" role="status"><AlertTriangle size={17}/><div><strong>{attention.total} email{attention.total===1?"":"s"} need a delivery check</strong><span>Review these before retrying to avoid sending a customer the same email twice.</span></div><button type="button" onClick={()=>mail.chooseFolder(attention.id)}>Review now</button></div>}
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
