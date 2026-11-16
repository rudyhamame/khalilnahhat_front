import GuestVerify from './GuestVerify';
import LiveSignInPrompt from './LiveSignInPrompt';
import './orderSignIn.css';

// A guest verifies their email with a code to send the booking; clients who already have an account can still sign in.
export default function OrderSignIn({ar=false,auth}){
  return <section className="echo-section event-order-signin" aria-label={ar?'تأكيد البريد للحجز':'Verify your email to book'}>
    <GuestVerify ar={ar} auth={auth}/>
    <LiveSignInPrompt ar={ar} kind="booking" returnTo="/#event-order"/>
  </section>;
}
