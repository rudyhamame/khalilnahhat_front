import {BOOKING_GOALS} from './bookingGoals.js';
import {sectionLines} from './bookingReviewModel.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const money=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(value)||0);
// The printable "Booking confirmation" a client can save as a PDF from the Booking history. Everything is escaped; nothing is fetched or sent anywhere.
export function bookingConfirmationHtml(request,{now=new Date()}={}){
 const booked=Boolean(request?.journey?.isBooked),title=booked?'Booking confirmation':'Booking request summary';
 const reference=request?.requestNumber||request?.id||'';
 const sections=request?.order?BOOKING_GOALS.map(goal=>({title:goal.title,lines:sectionLines(request.order,goal,false).lines.filter(line=>!line.empty)})).filter(section=>section.lines.length):[];
 const prices=Boolean(request?.journey?.showsPrices);
 const items=(request?.items||[]).map(item=>`<tr><td>${esc(item.name)}</td><td class="num">${esc(item.quantity)}</td>${prices?`<td class="num">${money(item.unitPrice)}</td><td class="num">${money(item.lineTotal)}</td>`:''}</tr>`).join('');
 const date=value=>{const parsed=new Date(value);return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('en-CA',{dateStyle:'long',timeZone:'America/Toronto'}).format(parsed):'';};
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} ${esc(reference)}</title><style>
  body{font:14px/1.5 Arial,Helvetica,sans-serif;color:#17262c;margin:32px auto;max-width:780px;padding:0 20px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c9a45c;padding-bottom:14px;margin-bottom:18px}
  h1{margin:0;font-size:24px}h2{font-size:15px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#6a5424}
  .brand{font-weight:700;font-size:15px}.meta{text-align:right;font-size:13px}.status{display:inline-block;padding:2px 10px;border:1px solid #c9a45c;border-radius:999px;font-weight:700}
  table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #e2dccb;text-align:left;vertical-align:top}th{font-size:12px;color:#6a5424}
  .num{text-align:right}.label{width:36%;font-weight:700}.totals td{border:0;padding:2px 8px}.note{font-size:12px;color:#566;margin-top:22px}
  @media print{body{margin:0}a{color:inherit;text-decoration:none}}
 </style></head><body>
 <header><div><div class="brand">DJ Khalil Nahhat · Echo Event Entertainment</div><h1>${esc(title)}</h1></div>
 <div class="meta"><div>${esc(reference)}</div><div class="status">${esc(request?.journey?.label||'')}</div><div>Requested ${esc(date(request?.createdAt))}</div></div></header>
 ${sections.map(section=>`<h2>${esc(section.title)}</h2><table>${section.lines.map(line=>`<tr><td class="label">${esc(line.label)}</td><td>${esc(line.value)}</td></tr>`).join('')}</table>`).join('')}
 ${items?`<h2>Services and equipment</h2><table><thead><tr><th>Item</th><th class="num">Qty</th>${prices?'<th class="num">Unit price</th><th class="num">Total</th>':''}</tr></thead><tbody>${items}</tbody></table>`:''}
 ${prices?`<table class="totals"><tr><td></td><td class="num">Subtotal</td><td class="num">${money(request.subtotal)}</td></tr>${request.discount>0?`<tr><td></td><td class="num">Discount</td><td class="num">−${money(request.discount)}</td></tr>`:''}<tr><td></td><td class="num">Tax (${esc(request.taxPercent)}%)</td><td class="num">${money(request.tax)}</td></tr><tr><td></td><td class="num"><strong>Total</strong></td><td class="num"><strong>${money(request.total)}</strong></td></tr><tr><td></td><td class="num">Deposit</td><td class="num">${money(request.deposit)}</td></tr><tr><td></td><td class="num">Remaining balance</td><td class="num">${money(request.balance)}</td></tr></table>`:''}
 <p class="note">${booked?'This booking is confirmed: your date is reserved and the deposit has been recorded.':'This is a summary of your request. Your date is not reserved until you accept the quote and the deposit is recorded.'} Generated ${esc(new Intl.DateTimeFormat('en-CA',{dateStyle:'long',timeStyle:'short',timeZone:'America/Toronto'}).format(now))} (Toronto).</p>
 </body></html>`;
}
export function openBookingConfirmation(request){
 const html=bookingConfirmationHtml(request),win=window.open('','_blank');
 if(!win)return false; // a blocked pop-up: the button tells the client
 win.document.open();win.document.write(html);win.document.close();win.focus();
 win.addEventListener('load',()=>win.print());setTimeout(()=>{try{win.print();}catch{/* The client can print from the window. */}},400);
 return true;
}
