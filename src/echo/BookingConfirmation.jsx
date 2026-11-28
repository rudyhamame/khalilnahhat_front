import {useState} from 'react';
import {ArrowUpRight,Check,CheckCircle2,Copy,LoaderCircle} from 'lucide-react';
import './bookingConfirmation.css';

export default function BookingConfirmation({code,ar=false,heading=true,cleaning=false,onPlanAnother,onRetryCleanup,cleanupError='',hideWorkspaceLink=false}){
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState('');
 const tr=(en,arabic)=>ar?arabic:en;
 const copy=async()=>{
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(code);setCopied(true);setCopyError('');}
  catch{setCopyError(tr('Select the booking ID to copy it.','حدّد رقم الحجز لنسخه.'));}
 };
 return <section className="booking-receipt" dir={ar?'rtl':'ltr'} aria-label={tr('Booking request received','تم استلام طلب الحجز')}>
  <div className="booking-receipt-mark" aria-hidden="true"><CheckCircle2 size={28} strokeWidth={1.5}/></div>
  <span className="booking-receipt-eyebrow">{tr('SAFELY RECEIVED','تم الاستلام بنجاح')}</span>
  {heading&&<h2>{tr('Booking request received','تم استلام طلب الحجز')}</h2>}
  <p className="booking-receipt-intro">{tr('Your event details are with the Echo team. We’ll review your request and prepare your quotation.','وصلت تفاصيل فعاليتك إلى فريق إيكو. سنراجع طلبك ونُعدّ عرض السعر.')}</p>
  <div className="booking-receipt-code" role="group" aria-label={tr('Your booking ID','رقم حجزك')}>
   <span>{tr('YOUR BOOKING ID','رقم حجزك')}</span>
   <code dir="ltr" translate="no" tabIndex={0}>{code}</code>
   <button type="button" onClick={copy} aria-label={tr('Copy booking ID','نسخ رقم الحجز')}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?tr('Copied','تم النسخ'):tr('Copy code','نسخ الرقم')}</span></button>
  </div>
  <p className="booking-receipt-reminder">{tr('Please memorize or save this booking ID. Use it whenever you contact us about your booking.','يرجى حفظ رقم الحجز أو تذكّره، واستخدامه عند التواصل معنا بشأن حجزك.')}</p>
  {copyError&&<p className="booking-receipt-status" role="status">{copyError}</p>}
  <p className="booking-receipt-next">{tr('Your date will be reserved after the team confirms your booking.','سيُحجز موعدك بعد تأكيد فريقنا للحجز.')}</p>
  <div className="booking-receipt-actions">{!hideWorkspaceLink&&<a href="/dashboard/bookings">{tr('Open Client Workspace','فتح مساحة العميل')}<ArrowUpRight size={15}/></a>}{onPlanAnother&&!cleaning&&<button type="button" onClick={onPlanAnother}>{tr('Plan another event','خطّط لفعالية أخرى')}</button>}</div>
  {cleaning&&<p className="booking-receipt-status" role="status"><LoaderCircle size={14} className="booking-receipt-spinner"/>{tr('Preparing your next draft…','جارٍ تجهيز مسودتك التالية…')}</p>}
  {cleanupError&&<div className="booking-receipt-cleanup"><p role="status">{cleanupError}</p>{onRetryCleanup&&<button type="button" onClick={onRetryCleanup}>{tr('Retry draft cleanup','إعادة محاولة تنظيف المسودة')}</button>}</div>}
 </section>;
}

export function BookingSendingState({ar=false}){
 const tr=(en,arabic)=>ar?arabic:en;
 return <section className="booking-sending" role="status" aria-live="polite" dir={ar?'rtl':'ltr'}><span className="booking-receipt-mark"><LoaderCircle size={27} className="booking-receipt-spinner"/></span><h2>{tr('A moment for your event.','لحظة من أجل فعاليتك.')}</h2><p>{tr('We’re sending your reviewed details to Echo. Your Booking ID will appear here once your request is saved.','نرسل تفاصيلك المُراجَعة إلى إيكو. سيظهر رقم حجزك هنا بعد حفظ الطلب.')}</p></section>;
}
