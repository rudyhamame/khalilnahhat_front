import BookingSignup from './BookingSignup';
import LiveSignInPrompt from './LiveSignInPrompt';
import './orderSignIn.css';

// A visitor creates an account, confirms the email with a code and then sends the booking; clients who already have an account sign in.
export default function OrderSignIn({ar=false,auth}){
  return <section className="echo-section event-order-signin" aria-label={ar?'أنشئ حساباً للحجز':'Create an account to book'}>
    <BookingSignup ar={ar} auth={auth}/>
    <LiveSignInPrompt ar={ar} kind="booking" returnTo="/#event-order"/>
  </section>;
}
