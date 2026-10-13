import EchoShell from './EchoShell';
import EchoHome from './EchoHome';
import EquipmentPage from './EquipmentPage';
import QuotePage from './QuotePage';
import MeetingPage from './MeetingPage';
import EchoAdmin from './EchoAdmin';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './AccountPages';
import { AboutPage, ContactPage, GalleryPage, MixesPage, ReviewsPage, SERVICE_SLUGS, ServicePage } from './ContentPages';

// Returns the Echo page for a path, or null when the path belongs to the older app.
export default function renderEchoRoute(path, ctx) {
  const { lang, user, token, isSessionReady, onCreateServiceRequest } = ctx;
  const page = (el) => <EchoShell lang={lang}>{el}</EchoShell>;
  const slug = path.replace(/^\//, '');
  if (SERVICE_SLUGS.includes(slug)) return page(<ServicePage lang={lang} slug={slug} />);
  switch (path) {
    case '/': return page(<EchoHome lang={lang} />);
    case '/equipment': return page(<EquipmentPage lang={lang} />);
    case '/quote': return page(<QuotePage lang={lang} user={user} isSessionReady={isSessionReady} onCreateServiceRequest={onCreateServiceRequest} />);
    case '/meeting': return page(<MeetingPage lang={lang} user={user} token={token} isSessionReady={isSessionReady} />);
    case '/about': return page(<AboutPage lang={lang} />);
    case '/mixes': return page(<MixesPage lang={lang} />);
    case '/gallery': return page(<GalleryPage lang={lang} />);
    case '/reviews': return page(<ReviewsPage lang={lang} />);
    case '/contact': return page(<ContactPage lang={lang} />);
    case '/verify-email': return page(<VerifyEmailPage lang={lang} />);
    case '/forgot-password': return page(<ForgotPasswordPage lang={lang} />);
    case '/reset-password': return page(<ResetPasswordPage lang={lang} />);
    case '/admin/echo': return page(<EchoAdmin user={user} token={token} isSessionReady={isSessionReady} />);
    default: return null;
  }
}
