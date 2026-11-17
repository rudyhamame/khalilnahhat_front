import {contract,getPath,missingOrderFields} from './eventOrderCore.mjs';
const all=contract.sections.flatMap(section=>section.fields.map(field=>({...field,gate:section.gate})));
const definitions=[
 {id:'customer',title:'Personal info',ar:'المعلومات الشخصية',description:'Check your contact details before submitting your quote request.',descriptionAr:'راجع معلومات التواصل قبل إرسال طلب عرض السعر.'},
 {id:'event',title:'Event info',ar:'معلومات الفعالية',viewport:'availability',face:'calendar',chapter:'02',description:'Choose your event type, date, time, guests and venue. Times are in Toronto; an end after midnight is supported.',descriptionAr:'اختر نوع الفعالية والموعد والوقت والضيوف والمكان. التوقيت بتوقيت تورونتو ويمكن الانتهاء بعد منتصف الليل.'},
 {id:'music',title:'DJ service',ar:'خدمة الدي جي',viewport:'work',chapter:'03',description:'Add DJ Khalil service, then any optional music preferences. MC is available in chapter 04.',descriptionAr:'أضف خدمة دي جي خليل وتفضيلات الموسيقى الاختيارية. خدمة تقديم الحفل في القسم 04.'},
 {id:'equipment',title:'Rental services & equipment',ar:'الخدمات والمعدات للإيجار',viewport:'setup',chapter:'04',description:'Services, individual equipment and complete sets share your selection with the rental explorer. Stock remains subject to confirmation for your event date.',descriptionAr:'الخدمات والمعدات والمجموعات تشترك في اختياراتك مع مستكشف الإيجار. يُؤكد التوفر لتاريخ فعاليتك.'},
 {id:'references',title:'References & voucher',ar:'المراجع والقسيمة',description:'Add optional inspiration photos or links, event documents and a voucher.',descriptionAr:'أضف صوراً ملهمة أو روابطها، ومستندات الفعالية، وقسيمة اختيارية.'},
 {id:'notes',title:'Additional notes',ar:'ملاحظات إضافية',description:'Anything else we should know, optional. Submitting requests a quote; it does not reserve your date.',descriptionAr:'أي شيء آخر نحتاج معرفته، اختياري. الإرسال يطلب عرض سعر ولا يحجز الموعد.'},
];
// The sections are defined once, here. Goals, the Booking summary and the assistant read their titles and order from this list.
export const bookingStepDefinition=id=>definitions.find(step=>step.id===id)||null;
export const stepLabel=id=>{const step=bookingStepDefinition(id);return [step.title,step.ar];};
export function bookingStepForField(path){
 if(path==='music.mcRequested'||path==='music.djMc'||path==='rental.requested')return 'equipment';
 if(path==='services'||path==='equipment'||path?.startsWith('equipment.'))return 'equipment';
 if(path?.startsWith('event.setup.'))return 'equipment';
 if(path?.startsWith('event.'))return 'event';
 if(path?.startsWith('music.'))return 'music';
 if(path?.startsWith('customer.'))return 'customer';
 if(path==='additional.notes')return 'notes';
 return 'references';
}
export function bookingSteps(order){
 // Six sections, in the Booking summary's order: Personal info, Event info, DJ service, Rental services & equipment, References & voucher, Additional notes.
 return definitions.map(step=>({...step,fields:all.filter(field=>bookingStepForField(field.key)===step.id&&(!field.gate||getPath(order,field.gate)===true))}));
}
export function bookingIssueStep(order,issues){const keys=new Set(issues.map(issue=>typeof issue==='string'?issue:issue.key));return bookingSteps(order).find(step=>step.fields.some(field=>keys.has(field.key)))?.id||(keys.has('equipment')?'equipment':'references');}
export function firstIncompleteStep(order){return bookingIssueStep(order,missingOrderFields(order));}
export function missingViewportFields(order){return missingOrderFields(order).filter(field=>['customer','event'].includes(bookingStepForField(field.key)));}
export const MC_NOTE='MC service requested';
export const djServiceChoice=order=>!order.services?.includes('dj')?'none':String(order.music?.djMc||'').split('\n').includes(MC_NOTE)?'dj_mc':'dj';
export function djServiceChanges(order,choice){
 return [{path:'music.djRequested',value:choice!=='none'}];
}

export function venueSelectionChanges(place){
 const fields={name:String(place.name||'').slice(0,160),address:String(place.address||'').slice(0,240),city:String(place.city||'').slice(0,80),postalCode:place.postalCode||'',country:place.country||'Canada',addressDetails:place.details||null,latitude:place.latitude??null,longitude:place.longitude??null,source:place.source||null,sourceId:place.sourceId||null,sourceAttribution:place.sourceAttribution||null};
 return Object.entries(fields).map(([key,value])=>({path:'event.venue.'+key,value}));
}
