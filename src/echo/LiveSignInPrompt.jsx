export default function LiveSignInPrompt({ ar, kind }) {
  const message = kind === 'comments'
    ? (ar ? 'سجّل الدخول لقراءة تعليقات هذا البث والمشاركة فيها.' : 'Sign in to read and join this broadcast’s comments.')
    : (ar ? 'سجّل الدخول لاقتراح أغنية لهذا البث.' : 'Sign in to suggest a song for this broadcast.');
  return <div className="live-signin-prompt"><p>{message}</p><a className="echo-btn" href="/login" onClick={() => {
    try { localStorage.setItem('khalil-auth-return', '/#live'); } catch { /* Sign-in remains available. */ }
  }}>{ar ? 'تسجيل الدخول' : 'Sign in'}</a></div>;
}
