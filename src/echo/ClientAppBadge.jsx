import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../lib/api';
import './clientAppBadge.css';

// Public "Echo Event for Android" download badge (the client app) for everyone: guests, clients and admins.
// The file is EchoEvent.apk on the server volume, served by GET /api/android/client.
export default function ClientAppBadge({ tr, className = 'client-app-badge--cta' }) {
  const badge = <a className={`client-app-badge ${className}`} aria-label={`Echo Event ${tr("for Android","لأندرويد")}`} href={`${apiBaseUrl}/android/client`} download>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.5a5.6 5.6 0 0 0-11.2 0zM8.6 7.2a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4m6.8 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4M6.4 10.3v6.4c0 .6.5 1.1 1.1 1.1h.9v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h2.8v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h.9c.6 0 1.1-.5 1.1-1.1v-6.4zM4.2 10.3a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1m15.6 0a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1"/></svg>
    <span><small>{tr('Download the app', 'حمّل التطبيق')}</small><b>Echo Event {tr('for Android', 'لأندرويد')}</b></span>
  </a>;
  // Phones portrait: the player badge also lives in the header (next to the language button); CSS shows one copy per layout.
  const header = className.includes('player') && typeof document !== 'undefined' ? document.querySelector('.echo-header') : null;
  return header ? <>{badge}{createPortal(<a className="client-app-badge client-app-badge--header" href={`${apiBaseUrl}/android/client`} download aria-label={`Echo Event ${tr('for Android', 'لأندرويد')}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.5a5.6 5.6 0 0 0-11.2 0zM8.6 7.2a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4m6.8 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4M6.4 10.3v6.4c0 .6.5 1.1 1.1 1.1h.9v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h2.8v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h.9c.6 0 1.1-.5 1.1-1.1v-6.4zM4.2 10.3a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1m15.6 0a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1"/></svg></a>, header)}</> : badge;
}

// Home page header: the Android download as a bare white icon (no label, no box).
export function AndroidIconLink({ tr }) {
  return <a className="echo-icon-button echo-android" href={`${apiBaseUrl}/android/client`} download aria-label={`Echo Event ${tr('for Android', 'لأندرويد')}`} title={`Echo Event ${tr('for Android', 'لأندرويد')}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.5a5.6 5.6 0 0 0-11.2 0zM8.6 7.2a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4m6.8 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4M6.4 10.3v6.4c0 .6.5 1.1 1.1 1.1h.9v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h2.8v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h.9c.6 0 1.1-.5 1.1-1.1v-6.4zM4.2 10.3a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1m15.6 0a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1"/></svg><span className="echo-android-text">{tr('Download Echo Event Android App','حمّل تطبيق إيكو إيفنت للأندرويد')}</span></a>;
}
