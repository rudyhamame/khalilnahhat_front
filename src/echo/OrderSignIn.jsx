export default function OrderSignIn({ar=false}){
  return <section className="echo-section" aria-label={ar?'تسجيل الدخول للحجز':'Sign in to book'}>
    <p>{ar?'يجب تسجيل الدخول لبدء طلب يدوي أو بمساعدة الذكاء الاصطناعي.':'Sign in to start a manual or AI-assisted order.'}</p>
    <a className="echo-btn" href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/?resumeOrder=1#how-to-book');}catch{/* Sign-in remains available without storage. */}}}>{ar?'تسجيل الدخول':'Sign in'}</a>
  </section>;
}
