// Alt text for the admin dashboard, written once. It gives every control a tooltip (title) and a screen-reader label (aria-label / alt).
// `decorate` fills ONLY what a component left empty, so any hand-written title or aria-label always wins.
export const norm=text=>String(text||'').replace(/\s+/g,' ').trim().toLowerCase();

// Visible label (lower case) -> [tooltip in English, tooltip in Arabic]. The tooltip says what the control does and what happens next.
export const ALT=new Map(Object.entries({
 'booking date available':['Tell the client the requested date and time are available. The booking moves on to preparing the quote.','أبلغ العميل أن التاريخ والوقت المطلوبين متاحان. ينتقل الحجز إلى مرحلة تجهيز عرض السعر.'],
 'booking date available ✓':['The client has already been told this date is available.','تم إبلاغ العميل بأن التاريخ متاح.'],
 'confirm availability':['Tell the client the requested date and time are available. The booking moves on to preparing the quote.','أبلغ العميل أن التاريخ والوقت المطلوبين متاحان. ينتقل الحجز إلى مرحلة تجهيز عرض السعر.'],
 'send quote':['Send this quote to the client and email them. They can accept it, ask for changes or decline.','أرسل عرض السعر هذا للعميل مع بريد إلكتروني. يمكنه القبول أو طلب تعديلات أو الرفض.'],
 'record deposit':['Go to the payment form to record the deposit once you have received it.','انتقل إلى نموذج الدفعات لتسجيل العربون بعد استلامه.'],
 'booking date not available':['Tell the client the date is not available and explain why. The request stays open so they can book a meeting or suggest another date.','أبلغ العميل أن التاريخ غير متاح مع السبب. يبقى الطلب مفتوحاً ليحجز اجتماعاً أو يقترح تاريخاً آخر.'],
 'inform client':['Send the client the reason this date is not available.','أرسل للعميل سبب عدم توفر هذا التاريخ.'],
  'update sent quote':['Replace the quote the client sees with these changes and let them know.','استبدل عرض السعر الذي يراه العميل بهذه التعديلات وأبلغه.'],
 'cancel request':['Cancel this booking request. The client is told it was cancelled.','ألغِ طلب الحجز هذا. سيُبلَّغ العميل بالإلغاء.'],
 'delete permanently':['Permanently remove this booking from the database and from the client\'s dashboard. This cannot be undone.','احذف هذا الحجز نهائياً من قاعدة البيانات ومن لوحة العميل. لا يمكن التراجع عن ذلك.'],
 'delete':['Permanently remove this item. This cannot be undone.','احذف هذا العنصر نهائياً. لا يمكن التراجع عن ذلك.'],
 'previous step':['Move this booking back one step in the Booking status. Not possible after a payment is recorded.','أعد هذا الحجز خطوة إلى الوراء في حالة الحجز. غير ممكن بعد تسجيل دفعة.'],
 'load rates':['Fill the prices from the pricing engine. You still review every price before publishing.','املأ الأسعار من محرك التسعير. تراجع كل سعر قبل النشر.'],
 'amount':['Enter this as a fixed amount in Canadian dollars.','أدخل هذا كمبلغ ثابت بالدولار الكندي.'],
 'percent':['Enter this as a percentage.','أدخل هذا كنسبة مئوية.'],
 'booking discount':['A discount taken off the subtotal before tax.','خصم يُحسم من المجموع قبل الضريبة.'],
 'tax %':['Sales tax applied after the discount.','ضريبة المبيعات بعد الخصم.'],
 'deposit':['Part of the total the client pays to secure the booking. It counts toward the total and is kept if the contract is broken.','جزء من المجموع يدفعه العميل لتثبيت الحجز. يُحتسب من المجموع ويُحتفظ به عند الإخلال بالعقد.'],
 'valid days':['How many days the client has to accept this quote.','عدد الأيام التي يملكها العميل لقبول عرض السعر.'],
 'payment instructions':['How the client should pay the deposit. Shown on their booking.','كيف يدفع العميل العربون. يظهر في حجزه.'],
 'message to customer':['An optional note the client sees together with the quote.','ملاحظة اختيارية يراها العميل مع عرض السعر.'],
 'record payment':['Record a payment received outside the app (e-transfer, cheque, bank transfer). Only administrators record payments.','سجّل دفعة استُلمت خارج التطبيق (تحويل إلكتروني أو شيك أو تحويل بنكي). المسؤولون وحدهم يسجلون الدفعات.'],
 'void':['Cancel this recorded payment. It stays in the list but no longer counts.','ألغِ هذه الدفعة المسجلة. تبقى في القائمة لكنها لا تُحتسب.'],
 'extend':['Give the client more days to accept this quote.','امنح العميل أياماً إضافية لقبول عرض السعر.'],
 'reactivate':['Bring this expired quote back so the client can accept it.','أعد تفعيل عرض السعر المنتهي ليتمكن العميل من قبوله.'],
 'summarize with ai':['Ask AI for a short summary of this booking.','اطلب من الذكاء الاصطناعي ملخصاً قصيراً لهذا الحجز.'],
 'fix and make it formal & polite (ai)':['AI fixes spelling and grammar and rewrites your reason formally and politely. You read it before sending; Undo restores yours.','يصحح الذكاء الاصطناعي الإملاء والنحو ويعيد صياغة السبب برسمية وأدب. تقرؤه قبل الإرسال ويعيد التراجع نصك.'],
 'polish with ai · subject & body':['AI fixes spelling and grammar, rewrites the message formally and politely, and writes the subject. You review it before sending; Undo restores yours.','يصحح الذكاء الاصطناعي الإملاء والنحو، ويعيد صياغة الرسالة برسمية وأدب، ويكتب الموضوع. تراجعها قبل الإرسال ويعيد التراجع نصك.'],
 'undo':['Restore what you wrote before the AI rewrite.','استرجع ما كتبته قبل إعادة الصياغة.'],
 'review email':['Check the recipients and message. Nothing is sent yet.','راجع المستلمين والرسالة. لم يُرسل شيء بعد.'],
 'confirm and send':['Send the email now.','أرسل البريد الآن.'],
 'meet with us':['Book an optional planning meeting.','احجز اجتماع تخطيط اختيارياً.'],
 'withdraw booking':['Withdraw this booking request before a quote is published.','اسحب طلب الحجز هذا قبل نشر عرض السعر.'],
 'accept quote':['Accept this quote. The booking becomes Booked after the required deposit and confirmation.','اقبل عرض السعر. يصبح الحجز مؤكداً بعد دفع العربون المطلوب والتأكيد.'],
 'request changes':['Ask for changes to this quote.','اطلب تعديلات على عرض السعر.'],
 'cancel':['Close this without saving.','أغلق هذا دون حفظ.'],
 'save':['Save your changes.','احفظ تغييراتك.'],
 'refresh':['Reload this information.','أعد تحميل هذه المعلومات.'],
 'sign out':['Sign out of this account.','سجّل الخروج من هذا الحساب.'],
 'skip to workspace':['Jump past the navigation to the main content.','تخطَّ التنقل إلى المحتوى الرئيسي.'],
}));

export const altForLabel=(text,ar=false)=>{const hit=ALT.get(norm(text));return hit?hit[ar?1:0]:'';};

// Icon-only controls: a label guessed from the control's class names (and its title), so a screen reader never says just "button".
const ICONS=[
 [/close|dismiss|x-btn/,'Close','إغلاق'],[/delete|trash|remove/,'Delete','حذف'],[/edit|pencil/,'Edit','تعديل'],[/refresh|reload|sync/,'Refresh','تحديث'],
 [/search/,'Search','بحث'],[/menu|hamburger/,'Open menu','فتح القائمة'],[/play/,'Play','تشغيل'],[/pause/,'Pause','إيقاف مؤقت'],[/send|submit/,'Send','إرسال'],
 [/copy/,'Copy','نسخ'],[/download/,'Download','تنزيل'],[/upload/,'Upload','رفع'],[/expand|chevron-down|collapse/,'Expand or collapse','توسيع أو طي'],
 [/more|ellipsis|dots/,'More actions','المزيد من الإجراءات'],[/back|arrow-left|prev/,'Back','رجوع'],[/next|arrow-right/,'Next','التالي'],[/add|plus|new/,'Add','إضافة'],
 [/mute|volume|mic/,'Audio control','التحكم بالصوت'],[/theme|light|dark/,'Change theme','تغيير المظهر'],[/info|help/,'More information','مزيد من المعلومات'],
];
export const iconAltFor=(hint,ar=false)=>{const found=ICONS.find(([pattern])=>pattern.test(norm(hint)));return found?found[ar?2:1]:'';};

// Small status chips and codes get a tooltip that names what they are.
export const BADGES=[
 ['.admin-service-request-status','Booking status','حالة الحجز'],
 ['.ea-atom-code','Data atom code: the fixed number of this booking detail','رمز عنصر البيانات: الرقم الثابت لهذه المعلومة'],
 ['.bqe-code','Catalogue code of this item','رمز هذا البند في الكتالوج'],
 ['.booking-status-band','Booking status: where this booking is in its journey','حالة الحجز: أين وصل هذا الحجز'],
];

const OWN='altOwn';
const setOwn=(el,attr,value)=>{if(!value)return;if(el.hasAttribute(attr)&&el.dataset[OWN+attr]!=='1')return;el.setAttribute(attr,value);el.dataset[OWN+attr]='1';};

/** Fill missing tooltips, screen-reader names and image alts under `root`. Safe to run again after every DOM change. */
export function decorate(root,ar=false){
 for(const el of root.querySelectorAll('button,a[href],summary,[role=button],[role=tab],[role=menuitem]')){
  const text=norm(el.textContent),named=el.getAttribute('aria-label')||'';
  const known=altForLabel(text||named,ar);
  if(known)setOwn(el,'title',known);
  if(!text&&!named&&!el.getAttribute('aria-labelledby')){const guess=iconAltFor(`${el.className} ${el.getAttribute('title')||''}`,ar);if(guess){setOwn(el,'aria-label',guess);setOwn(el,'title',guess);}}
 }
 for(const el of root.querySelectorAll('input,select,textarea')){
  if(el.type==='hidden')continue;
  const label=el.labels?.[0]?.textContent||'',placeholder=el.getAttribute('placeholder')||'';
  if(!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!label){const name=placeholder||el.getAttribute('name')||'';if(name)setOwn(el,'aria-label',name.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'));}
  const known=altForLabel(label,ar)||altForLabel(placeholder,ar);if(known)setOwn(el,'title',known);
 }
 for(const img of root.querySelectorAll('img:not([alt])'))img.setAttribute('alt',img.getAttribute('title')||img.closest('figure')?.querySelector('figcaption')?.textContent?.trim()||''); // empty alt = decorative
 for(const svg of root.querySelectorAll('svg:not([aria-hidden])')){svg.setAttribute('focusable','false');if(svg.closest('[aria-label]')||svg.closest('button,a,summary,[role=button]')?.textContent.trim())svg.setAttribute('aria-hidden','true');}
 for(const [selector,en,arabic] of BADGES)for(const el of root.querySelectorAll(selector)){const text=el.textContent.replace(/\s+/g,' ').trim();setOwn(el,'title',selector==='.booking-status-band'?(ar?arabic:en):`${ar?arabic:en}${text?`: ${text}`:''}`);}
}

/** Cut-off (ellipsis) text shows its full text as a tooltip on hover. */
export function fullTextOnHover(target){
 for(let el=target;el&&el.nodeType===1&&el.tagName!=='BODY';el=el.parentElement){
  if(el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).textOverflow==='ellipsis'){setOwn(el,'title',el.textContent.replace(/\s+/g,' ').trim());return;}
 }
}
