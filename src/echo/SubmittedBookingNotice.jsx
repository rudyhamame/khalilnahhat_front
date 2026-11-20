import {useEventOrder} from './eventOrderContext';
import {contactEmail} from '../lib/publicContact';
import './submittedBookingNotice.css';

// While a submitted booking is still being handled the form shows its values, locked: say why and what the client can do.
export default function SubmittedBookingNotice({ar=false}){
 const ctx=useEventOrder();
 if(!ctx?.pendingRequest)return null;
 const tr=(en,arabic)=>ar?arabic:en;
 return <aside className="submitted-notice" role="status" dir={ar?'rtl':'ltr'}>
  <strong>{tr('Your booking has been submitted','تم إرسال حجزك')}</strong>
  <p>{tr('This page is locked while Echo reviews it. You can wait until Echo reviews your previous booking, or withdraw it from your dashboard.','هذه الصفحة مقفلة أثناء مراجعة Echo لحجزك. يمكنك الانتظار حتى تراجع Echo حجزك السابق، أو سحبه من لوحة التحكم.')}</p>
  <p>{tr('To change a field after booking, send us an email: ','لتعديل أي حقل بعد الحجز، أرسل لنا رسالة بريد إلكتروني: ')}<a href={`mailto:${contactEmail}`}>{contactEmail}</a>. <a href="/dashboard">{tr('Open dashboard','فتح لوحة التحكم')}</a></p>
 </aside>;
}
