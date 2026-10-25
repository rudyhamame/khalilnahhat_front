import EchoShell from './EchoShell';
import EchoHome from './EchoHome';
import EchoLivePage from './EchoLivePage';
import EquipmentPage from './EquipmentPage';
import QuotePage from './QuotePage';
import MeetingPage from './MeetingPage';
import EchoAdmin from './EchoAdmin';
import MusicArchivePage from './MusicArchivePage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './AccountPages';
import { AboutPage, ContactPage, GalleryPage, ReviewsPage, SERVICE_SLUGS, ServicePage, ServicesOverview } from './ContentPages';

// Account and dashboard routes are owned by App; public routes always use Echo.
export default function renderEchoRoute(path, ctx) {
  const { lang, user, token, isSessionReady, onCreateServiceRequest, onLogout, search } = ctx;
  const page = (el) => <EchoShell lang={lang} user={user}>{el}</EchoShell>;
  const slug = path.replace(/^\//, '');
  const albumRoute = path.match(/^\/music-archive\/albums\/([^/]+)$/);
  if (albumRoute) return page(<MusicArchivePage lang={lang} albumId={albumRoute[1]} />);
  if (SERVICE_SLUGS.includes(slug)) return page(<ServicePage lang={lang} slug={slug} />);
  switch (path) {
    case '/': return page(<EchoHome lang={lang} />);
    case '/live': return page(<EchoLivePage lang={lang} />);
    case '/services': return page(<ServicesOverview lang={lang} />);
    case '/equipment': return page(<EquipmentPage lang={lang} />);
    case '/quote': return page(<QuotePage lang={lang} user={user} isSessionReady={isSessionReady} onCreateServiceRequest={onCreateServiceRequest} />);
    case '/dates':
    case '/meeting': return page(<MeetingPage lang={lang} user={user} token={token} isSessionReady={isSessionReady} />);
    case '/about': return page(<AboutPage lang={lang} />);
    case '/archive':
    case '/mixes':
    case '/music-archive': return page(<MusicArchivePage lang={lang} />);
    case '/gallery': return page(<GalleryPage lang={lang} />);
    case '/reviews': return page(<ReviewsPage lang={lang} />);
    case '/contact': return page(<ContactPage lang={lang} />);
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
