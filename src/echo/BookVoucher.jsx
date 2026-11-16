import {useEffect,useState} from 'react';
import {Ticket} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {track} from '../lib/analytics';
import './bookVoucher.css';

// The voucher the owner announces (Admin > Vouchers), shown inside the Book page. Tapping it starts a booking with the code applied.
export default function BookVoucher({ar=false}){
 const [voucher,setVoucher]=useState(null);
 useEffect(()=>{let alive=true;apiRequest('/vouchers/announcement').then(result=>{if(alive)setVoucher(result.voucher||null);}).catch(()=>{});return()=>{alive=false;};},[]);
 if(!voucher)return null;
 const value=voucher.kind==='percent'?`${voucher.percent}%`:`$${(voucher.amountCents/100).toFixed(2).replace(/\.00$/,'')}`;
 const title=voucher.title&&!/^[\d\s.%$]+$/.test(voucher.title)?voucher.title:'';
 const until=voucher.endsAt?new Date(voucher.endsAt).toLocaleDateString(ar?'ar-CA':'en-CA',{month:'short',day:'numeric',timeZone:'America/Toronto'}):'';
 const note=[title,until?(ar?`حتى ${until}`:`until ${until}`):''].filter(Boolean).join(' · ');
 return <button type="button" className="book-voucher" dir={ar?'rtl':'ltr'} onClick={()=>{track('hero_cta_click',{place:'voucher'});window.dispatchEvent(new CustomEvent('echo:book-event',{detail:{voucher:voucher.code}}));}} title={ar?'احجز الآن واستخدم القسيمة':'Book now and use this voucher'}>
  <span className="book-voucher-icon" aria-hidden="true"><Ticket size={22} strokeWidth={1.7}/></span>
  <span className="book-voucher-copy"><small>{ar?'قسيمة':'VOUCHER'}</small><strong>{value} {ar?'خصم':'OFF'}</strong>{note&&<em>{note}</em>}</span>
  <span className="book-voucher-code" dir="ltr">{voucher.code}</span>
 </button>;
}
