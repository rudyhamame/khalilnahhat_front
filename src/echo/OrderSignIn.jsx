import LoginPage from '../components/LoginPage';
import {AudioLines} from 'lucide-react';
import './orderSignIn.css';
export default function OrderSignIn({ar=false,auth}){
  const resume=()=>{try{localStorage.setItem('khalil-auth-return','/#event-order');}catch{/* Optional storage. */}};
  const embeddedAuth=auth&&{...auth,...Object.fromEntries(['onLogin','onSignup','onGoogleLogin'].map(key=>[key,async payload=>{resume();return auth[key](payload);}]))};
  return <section className="echo-section event-order-signin" aria-label={ar?'تسجيل الدخول للحجز':'Sign in to book'}>
    <div className="order-access-brand"><span aria-hidden="true"><AudioLines size={22}/></span><div><strong>ECHO <span>AI</span></strong><small>{ar?'مساعد فعاليتك':'YOUR EVENT ASSISTANT'}</small></div></div>
    {!auth&&<p>{ar?'يجب تسجيل الدخول لبدء طلب يدوي أو بمساعدة الذكاء الاصطناعي.':'Sign in to start a manual or AI-assisted order.'}</p>}
    {auth ? <LoginPage embedded lang={{lang:ar?'ar':'en',t:{}}} {...embeddedAuth}/> : <a className="echo-btn" href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#event-order');}catch{/* Sign-in remains available without storage. */}}}>{ar?'تسجيل الدخول':'Sign in'}</a>}
  </section>;
}
