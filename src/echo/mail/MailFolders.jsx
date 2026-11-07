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
export default function MailFolders({ mail, composer }) {
  const { folders, folder, chooseFolder, storage } = mail;
  return (
    <aside className="ae-folders" aria-label="Mail folders">
      <nav>
        {folders.map((item) => {
          const Icon = icons[item.type] || Inbox;
          return (
            <button
              type="button"
              key={item.id}
              aria-current={folder === item.id ? "page" : undefined}
              onClick={() => chooseFolder(item.id)}
            >
              <Icon size={17} />
              <span>{item.name}</span>
              {item.unread > 0 && item.type !== "Sent" && (
                <b aria-label={`${item.unread} unread`}>{item.unread}</b>
              )}
            </button>
          );
        })}
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
      </nav>
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
