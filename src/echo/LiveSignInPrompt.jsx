import {LogIn} from 'lucide-react';
import './liveSignInPrompt.css';

export default function LiveSignInPrompt({ ar, kind, returnTo = '/#live' }) {
  const message = kind === 'booking' ? (ar ? 'سجّل الدخول للتخطيط لفعاليتك مع إيكو AI.' : 'Sign in to plan your event with Echo AI.') : kind === 'expired' ? (ar ? 'انتهت جلسة تسجيل الدخول. سجّل الدخول لمتابعة البث.' : 'Your sign-in expired. Sign in again to continue watching.') : kind === 'watch' ? (ar ? 'سجّل الدخول لمشاهدة البث المباشر والمشاركة.' : 'Sign in to watch the live set and join the audience.') : kind === 'comments'
    ? (ar ? 'سجّل الدخول لقراءة تعليقات هذا البث والمشاركة فيها.' : 'Sign in to read and join this live stream’s comments.')
    : (ar ? 'سجّل الدخول لاقتراح أغنية لهذا البث.' : 'Sign in to suggest a song for this live stream.');
  return <div className="live-signin-prompt" dir={ar ? 'rtl' : 'ltr'}><p>{message}</p><a className="live-signin-button" href="/login" onClick={() => {
    try { localStorage.setItem('khalil-auth-return', returnTo); } catch { /* Sign-in remains available. */ }
  }}><LogIn size={17} aria-hidden="true"/><span>{ar ? 'تسجيل الدخول' : 'Sign in'}</span></a></div>;
}
