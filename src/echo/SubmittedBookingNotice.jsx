import {useEventOrder} from './eventOrderContext';
import {contactEmail} from '../lib/publicContact';
import './submittedBookingNotice.css';

// While a submitted booking is still being handled the form shows its values, locked: say why and what the client can do.
export default function SubmittedBookingNotice({ar=false}){
 const ctx=useEventOrder();
 if(!ctx?.pendingRequest)return null;
 const tr=(en,arabic)=>ar?arabic:en;
 return <aside className="submitted-notice" role="status" dir={ar?'rtl':'ltr'}>
  <strong>{tr('You already have an active booking','لديك حجز نشط بالفعل')}</strong>
  <p>{tr('You can’t start a new booking while this one is active. Every field below shows your current booking and is locked.','لا يمكنك بدء حجز جديد ما دام هذا الحجز نشطاً. كل حقل أدناه يعرض حجزك الحالي وهو مقفل.')}</p>
  <p>{tr('You can wait until it is completed, or withdraw it from your dashboard.','يمكنك الانتظار حتى يكتمل، أو سحبه من لوحة التحكم.')}</p>
  <p>{tr('To change a field after booking, send us an email: ','لتعديل أي حقل بعد الحجز، أرسل لنا رسالة بريد إلكتروني: ')}<a href={`mailto:${contactEmail}`}>{contactEmail}</a>. <a href="/dashboard">{tr('Open dashboard','فتح لوحة التحكم')}</a></p>
 </aside>;
}
