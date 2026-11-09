import LiveSignInPrompt from './LiveSignInPrompt';
import './orderSignIn.css';

export default function OrderSignIn({ar=false}){
  return <section className="echo-section event-order-signin" aria-label={ar?'تسجيل الدخول للحجز':'Sign in to book'}>
    <LiveSignInPrompt ar={ar} kind="booking" returnTo="/#event-order"/>
  </section>;
}
