import './sessionExpired.css';

/** Shown when a saved sign-in is rejected at page load. The booking draft stays in this browser, keyed to the account. */
export default function SessionExpiredNotice({ lang, onDismiss }) {
  const ar = lang === 'ar';
  return (
    <div className="session-expired" role="status" dir={ar ? 'rtl' : 'ltr'}>
      <p>
        <strong>{ar ? 'انتهت جلستك.' : 'Your session expired.'}</strong>{' '}
        {ar ? 'مسودتك محفوظة على هذا الجهاز. سجّل الدخول للمتابعة من حيث توقفت.' : 'Your draft is saved on this device. Sign in to pick up where you left off.'}
      </p>
      <a className="session-expired-signin" href="/login">{ar ? 'تسجيل الدخول' : 'Sign in'}</a>
      <button type="button" onClick={onDismiss} aria-label={ar ? 'إغلاق' : 'Dismiss'}>×</button>
    </div>
  );
}
