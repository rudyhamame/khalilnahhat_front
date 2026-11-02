export default function LiveSignInPrompt({ ar, kind }) {
  const message = kind === 'expired' ? (ar ? 'انتهت جلسة تسجيل الدخول. سجّل الدخول لمتابعة البث.' : 'Your sign-in expired. Sign in again to continue watching.') : kind === 'watch' ? (ar ? 'سجّل الدخول لمشاهدة البث المباشر والمشاركة.' : 'Sign in to watch the live set and join the audience.') : kind === 'comments'
    ? (ar ? 'سجّل الدخول لقراءة تعليقات هذا البث والمشاركة فيها.' : 'Sign in to read and join this live stream’s comments.')
    : (ar ? 'سجّل الدخول لاقتراح أغنية لهذا البث.' : 'Sign in to suggest a song for this live stream.');
  return <div className="live-signin-prompt"><p>{message}</p><a className="echo-btn" href="/login" onClick={() => {
    try { localStorage.setItem('khalil-auth-return', '/#live'); } catch { /* Sign-in remains available. */ }
  }}>{ar ? 'تسجيل الدخول' : 'Sign in'}</a></div>;
}
