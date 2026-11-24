import {bookingText,bookingLocale,bookingMoney} from './bookingUiText.js';
import {bookingStatusLabel} from './clientBookingJourney.js';
import {BOOKING_GOALS} from './bookingGoals.js';
import {sectionLines} from './bookingReviewModel.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
// The printable "Booking confirmation" a client can save as a PDF from the Booking history. Everything is escaped; nothing is fetched or sent anywhere.
const LOGO_PATH='/echo/echo-event-entertainment-transparent.webp';
// The client's uploaded inspiration photos (approved media origins only). They are shown as pictures in the PDF, never as links.
export function bookingPhotos(request){
 const list=request?.order?.references?.photos;
 return (Array.isArray(list)?list:[]).filter(item=>{try{const url=new URL(item?.url);return url.protocol==='https:'&&(url.hostname==='res.cloudinary.com'||(url.hostname==='vps-ba7fb4cb.vps.ovh.ca'&&url.pathname.startsWith('/khalil-media/')));}catch{return false;}});
}
// A downsized copy for print (a 900 px wide JPEG), so the PDF stays light.
export const printablePhotoUrl=url=>String(url).replace('/upload/','/upload/w_900,c_limit,q_auto,f_jpg/');
export function bookingConfirmationHtml(request,{now=new Date(),origin='',images={},ar=false}={}){
 const tr=text=>bookingText(text,ar),locale=bookingLocale(ar),money=value=>bookingMoney(value,ar);
 const src=url=>images[url]||url;
 const booked=Boolean(request?.journey?.isBooked),title=tr(booked?'Booking confirmation':'Booking request summary');
 const reference=request?.requestNumber||request?.id||'';
 const sections=request?.order?BOOKING_GOALS.map(goal=>({title:ar?goal.ar:goal.title,lines:sectionLines(request.order,goal,ar).lines.filter(line=>!line.empty&&line.key!=='references.photos')})).filter(section=>section.lines.length):[];
 const photos=bookingPhotos(request),prices=Boolean(request?.journey?.showsPrices);
 const items=(request?.items||[]).map(item=>`<tr><td>${esc(item.name)}</td><td class="num">${esc(item.quantity)}</td>${prices?`<td class="num">${money(item.unitPrice)}</td><td class="num">${money(item.lineTotal)}</td>`:''}</tr>`).join('');
 const date=value=>{const parsed=new Date(value);return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'America/Toronto'}).format(parsed):'';};
 return `<!doctype html><html lang="${ar?'ar':'en'}" dir="${ar?'rtl':'ltr'}"><head><meta charset="utf-8"><title>${esc(title)} ${esc(reference)}</title><style>
  body{font:14px/1.5 Arial,Helvetica,sans-serif;color:#17262c;margin:32px auto;max-width:780px;padding:0 20px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c9a45c;padding-bottom:14px;margin-bottom:18px}
  h1{margin:0;font-size:24px}h2{font-size:15px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#6a5424}
  .brandline{display:flex;align-items:center;gap:14px}.logo{width:84px;height:auto;display:block}
  .brand{font-weight:700;font-size:15px}.meta{text-align:end;font-size:13px}.status{display:inline-block;padding:2px 10px;border:1px solid #c9a45c;border-radius:999px;font-weight:700}
  table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #e2dccb;text-align:start;vertical-align:top}th{font-size:12px;color:#6a5424}
  .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.photos figure{margin:0;break-inside:avoid}.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border:1px solid #e2dccb;border-radius:6px;display:block}.photos figcaption{font-size:11.5px;color:#566;margin-top:3px;overflow-wrap:anywhere}
  .num{text-align:end}.label{width:36%;font-weight:700}.totals td{border:0;padding:2px 8px}.note{font-size:12px;color:#566;margin-top:22px}
  @media print{body{margin:0}a{color:inherit;text-decoration:none}}
 </style></head><body>
 <header><div class="brandline"><img class="logo" src="${esc(src(origin+LOGO_PATH))}" alt="Echo Event Entertainment"><div><div class="brand">DJ Khalil Nahhat · Echo Event Entertainment</div><h1>${esc(title)}</h1></div></div>
 <div class="meta"><div>${esc(reference)}</div><div class="status">${esc(bookingStatusLabel(request,ar))}</div><div>${esc(tr('Requested'))} ${esc(date(request?.createdAt))}</div></div></header>
 ${sections.map(section=>`<h2>${esc(section.title)}</h2><table>${section.lines.map(line=>`<tr><td class="label">${esc(line.label)}</td><td>${esc(line.value)}</td></tr>`).join('')}</table>`).join('')}
 ${photos.length?`<h2>${esc(tr('Photos'))}</h2><div class="photos">${photos.map(photo=>`<figure><img src="${esc(src(printablePhotoUrl(photo.url)))}" alt="${esc(photo.name)}"><figcaption>${esc(photo.name)}${photo.comment?` — ${esc(photo.comment)}`:''}</figcaption></figure>`).join('')}</div>`:''}
 ${items?`<h2>${esc(tr('Rental services and equipment'))}</h2><table><thead><tr><th>${esc(tr('Item'))}</th><th class="num">${esc(tr('Qty'))}</th>${prices?`<th class="num">${esc(tr('Unit price'))}</th><th class="num">${esc(tr('Total'))}</th>`:''}</tr></thead><tbody>${items}</tbody></table>`:''}
 ${prices?`<table class="totals"><tr><td></td><td class="num">${esc(tr('Subtotal'))}</td><td class="num">${money(request.subtotal)}</td></tr>${request.discount>0?`<tr><td></td><td class="num">${esc(tr('Discount'))}</td><td class="num">−${money(request.discount)}</td></tr>`:''}<tr><td></td><td class="num">${esc(tr('Tax'))} (${esc(request.taxPercent)}%)</td><td class="num">${money(request.tax)}</td></tr><tr><td></td><td class="num"><strong>${esc(tr('Total'))}</strong></td><td class="num"><strong>${money(request.total)}</strong></td></tr><tr><td></td><td class="num">${esc(tr('Deposit'))}</td><td class="num">${money(request.deposit)}</td></tr><tr><td></td><td class="num">${esc(tr('Remaining balance'))}</td><td class="num">${money(request.balance)}</td></tr></table>`:''}
 <p class="note">${booked?(ar?'تم تأكيد هذا الحجز: حُجز موعدك وسُجّل العربون.':'This booking is confirmed: your date is reserved and the deposit has been recorded.'):(ar?'هذا ملخص طلبك. لا يُحجز موعدك حتى تقبل عرض السعر ويُسجّل العربون.':'This is a summary of your request. Your date is not reserved until you accept the quote and the deposit is recorded.')} ${esc(tr('Generated'))} ${esc(new Intl.DateTimeFormat(locale,{dateStyle:'long',timeStyle:'short',timeZone:'America/Toronto'}).format(now))} (${esc(tr('Toronto time'))}).</p>
 </body></html>`;
}
// Fetches an image and returns it as a data: URL, so the PDF carries the picture itself. Null when the browser/host refuses (the plain URL is used then).
async function embed(url){
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  const blob=await (await fetch(url,{signal:controller.signal})).blob();clearTimeout(timer);
  return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>resolve(null);reader.readAsDataURL(blob);});
 }catch{return null;}
}
export function openBookingConfirmation(request,{ar=false}={}){
 const tr=text=>bookingText(text,ar);
 const win=window.open('','_blank');
 if(!win)return false; // a blocked pop-up: the button tells the client
 win.document.open();win.document.write(`<!doctype html><html lang="${ar?'ar':'en'}" dir="${ar?'rtl':'ltr'}"><meta charset="utf-8"><title>${esc(tr('Preparing…'))}</title><p style="font:16px Arial;margin:40px">${esc(tr('Preparing your booking information…'))}</p></html>`);win.document.close();
 const origin=window.location.origin,urls=[origin+LOGO_PATH,...bookingPhotos(request).map(photo=>printablePhotoUrl(photo.url))];
 Promise.all(urls.map(async url=>[url,await embed(url)])).then(pairs=>{
  const images=Object.fromEntries(pairs.filter(([,data])=>data));
  win.document.open();win.document.write(bookingConfirmationHtml(request,{origin,images,ar}));win.document.close();win.focus();
  // Print once, when every picture is in (or after 2.5 s).
  let printed=false;const print=()=>{if(printed)return;printed=true;try{win.print();}catch{/* The client can print from the window. */}};
  win.addEventListener('load',print);setTimeout(print,2500);
 });
 return true;
}
