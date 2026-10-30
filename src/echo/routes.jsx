import EchoShell from './EchoShell';
import EchoHome from './EchoHome';
import MeetingPage from './MeetingPage';
import EchoAdmin from './EchoAdmin';
import MusicArchivePage from './MusicArchivePage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './AccountPages';
import { SERVICE_SLUGS, ServicePage } from './ContentPages';
import HomepageRedirect from './HomepageRedirect';
import {removedPublicPages} from './removedPublicPages';

// Account and dashboard routes are owned by App; public routes always use Echo.
export default function renderEchoRoute(path, ctx) {
  const { lang, user, token, isSessionReady, onCreateServiceRequest, onLogout, search, liveStream, liveSessions } = ctx;
  const page = (el) => <EchoShell lang={lang} user={user}>{el}</EchoShell>;
  if(removedPublicPages[path])return <HomepageRedirect href={removedPublicPages[path]}/>;
  const slug = path.replace(/^\//, '');
  const collectionRoute = path.match(/^\/music-archive\/collections\/([^/]+)$/);
  if (collectionRoute) return page(<MusicArchivePage lang={lang} collectionId={collectionRoute[1]} />);
  if (SERVICE_SLUGS.includes(slug)) return page(<ServicePage lang={lang} slug={slug} />);
  switch (path) {
    case '/draft-review': return <HomepageRedirect href="/#event-order"/>;
    case '/': return page(<EchoHome lang={lang} user={user} token={token} onCreateServiceRequest={onCreateServiceRequest} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady} auth={ctx.auth} />);
    case '/dates':
      return page(<MeetingPage lang={lang} user={user} token={token} isSessionReady={isSessionReady} />);
    case '/verify-email': return page(<VerifyEmailPage lang={lang} />);
    case '/forgot-password': return page(<ForgotPasswordPage lang={lang} />);
    case '/reset-password': return page(<ResetPasswordPage lang={lang} />);
    case '/admin/archive': return <EchoAdmin user={user} token={token} isSessionReady={isSessionReady} onLogout={onLogout} search="?tab=music-archive" />;
    case '/admin/echo': return <EchoAdmin user={user} token={token} isSessionReady={isSessionReady} onLogout={onLogout} search={search} />;
    default:
      if (/^\/(?:login|admin|dashboard)(?:\/|$)/.test(path)) return null;
      return page(<section className="echo-section"><p className="echo-eyebrow">404 / ECHO</p><h1>{lang.lang==='ar'?'الصفحة غير موجودة':'Page not found'}</h1><a className="echo-btn" href="/">{lang.lang==='ar'?'العودة للرئيسية':'Back to home'}</a></section>);
  }
}
