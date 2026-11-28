import {useState} from 'react';
import {X} from 'lucide-react';
import BookingConfirmation from './BookingConfirmation';

const KEY='echo-booking-receipt';
const read=()=>{try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');return saved&&typeof saved.code==='string'&&saved.code?saved:null;}catch{return null;}};
// Shown in the client dashboard right after a booking was sent from Echo AI. It stays (even after a reload) until the client closes it.
export default function BookingReceiptNotice({ar=false}){
 const [receipt,setReceipt]=useState(read);
 if(!receipt)return null;
 const close=()=>{try{localStorage.removeItem(KEY);}catch{/* Optional storage. */}setReceipt(null);};
 return <div className="booking-receipt-notice" role="dialog" aria-modal="true" aria-label={ar?'تم استلام طلب الحجز':'Booking request received'}>
  <div className="booking-receipt-notice-card">
   <button type="button" className="booking-receipt-notice-close" onClick={close} aria-label={ar?'إغلاق':'Close'}><X size={18} aria-hidden="true"/></button>
   <BookingConfirmation code={receipt.code} ar={ar} hideWorkspaceLink/>
   <button type="button" className="booking-receipt-notice-done" onClick={close}>{ar?'تم':'Done'}</button>
  </div>
 </div>;
}
