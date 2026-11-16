import {
  Archive,
  CircleAlert,
  FilePenLine,
  Inbox,
  Send,
  Trash2,
} from "lucide-react";
import { hasContent, sizeLabel } from "./mailPresentation";
const icons = {
  Inbox,
  Sent: Send,
  Archive,
  Unconfirmed: CircleAlert,
  Trash: Trash2,
};
const folderName = (item) =>
  item.type === "Unconfirmed" ? "Needs attention" : item.name;
const tabId = (id) => `mail-folder-tab-${String(id).replace(/[^a-z0-9_-]/gi, "-")}`;
export default function MailFolders({ mail, composer }) {
  const { folders, folder, chooseFolder, storage } = mail;
  const moveTab = (event, index) => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: folders.length - 1 };
    if (!(event.key in keys) || !folders.length) return;
    event.preventDefault();
    const next = (keys[event.key] + folders.length) % folders.length;
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus();
    chooseFolder(folders[next].id);
  };
  return (
    <aside className="ae-folders" aria-label="Mail folders">
      <nav className="ae-folder-tabs" role="tablist" aria-label="Mail folders">
        {folders.map((item, index) => {
          const Icon = icons[item.type] || Inbox;
          return (
            <button
              type="button"
              role="tab"
              key={item.id}
              id={tabId(item.id)}
              aria-selected={folder === item.id}
              aria-controls="mail-folder-panel"
              tabIndex={folder === item.id ? 0 : -1}
              onKeyDown={(event) => moveTab(event, index)}
              onClick={() => chooseFolder(item.id)}
            >
              <Icon size={17} />
              <span>{folderName(item)}</span>
              {item.unread > 0 && item.type !== "Sent" && (
                <b aria-label={`${item.unread} unread`}>{item.unread}</b>
              )}
            </button>
          );
        })}
      </nav>
      {hasContent(composer.draft) && (
        <button
          type="button"
          className="ae-draft-link"
          onClick={() => composer.compose()}
        >
          <FilePenLine size={17} />
          <span>Draft</span>
          <b>1</b>
        </button>
      )}
      {storage?.limitBytes > 0 && (
        <div className="ae-storage">
          <meter
            min="0"
            max={storage.limitBytes}
            value={storage.usedBytes || 0}
            aria-label="Mailbox storage used"
          />
          <span>
            {sizeLabel(storage.usedBytes || 0)} of{" "}
            {sizeLabel(storage.limitBytes)}
          </span>
          {storage.usedBytes / storage.limitBytes > 0.85 && (
            <p>
              Move old mail to Trash, then permanently remove it to free space.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
