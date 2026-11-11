import {contract,getPath,missingOrderFields} from './eventOrderCore.mjs';
const all=contract.sections.flatMap(section=>section.fields.map(field=>({...field,gate:section.gate})));
const definitions=[
 {id:'customer',title:'Personal info',ar:'المعلومات الشخصية',description:'Check your contact details before submitting your quote request.',descriptionAr:'راجع معلومات التواصل قبل إرسال طلب عرض السعر.'},
 {id:'event',title:'Event info',ar:'معلومات الفعالية',viewport:'availability',face:'calendar',chapter:'02',description:'Choose your event type, date, time, guests and venue. Times are in Toronto; an end after midnight is supported.',descriptionAr:'اختر نوع الفعالية والموعد والوقت والضيوف والمكان. التوقيت بتوقيت تورونتو ويمكن الانتهاء بعد منتصف الليل.'},
 {id:'music',title:'DJ service',ar:'خدمة الدي جي',viewport:'work',chapter:'03',description:'Add DJ Khalil service, then any optional music preferences. MC is available in chapter 04.',descriptionAr:'أضف خدمة دي جي خليل وتفضيلات الموسيقى الاختيارية. خدمة تقديم الحفل في القسم 04.'},
 {id:'equipment',title:'Rental services & equipment',ar:'الخدمات والمعدات للإيجار',viewport:'setup',chapter:'04',description:'Services, individual equipment and complete sets share your selection with the rental explorer. Stock remains subject to confirmation for your event date.',descriptionAr:'الخدمات والمعدات والمجموعات تشترك في اختياراتك مع مستكشف الإيجار. يُؤكد التوفر لتاريخ فعاليتك.'},
 {id:'references',title:'Review & submit',ar:'المراجعة والإرسال',description:'Add optional references, notes and a voucher. Submitting requests a quote; it does not reserve your date.',descriptionAr:'أضف المراجع والملاحظات والقسيمة الاختيارية. الإرسال يطلب عرض سعر ولا يحجز الموعد.'},
];
export function bookingStepForField(path){
 if(path==='music.mcRequested'||path==='music.djMc'||path==='rental.requested')return 'equipment';
 if(path==='services'||path==='equipment'||path?.startsWith('equipment.'))return 'equipment';
 if(path?.startsWith('event.setup.'))return 'equipment';
 if(path?.startsWith('event.'))return 'event';
 if(path?.startsWith('music.'))return 'music';
 if(path?.startsWith('customer.'))return 'customer';
 return 'references';
}
export function bookingSteps(order){
 // Four sections, in the Booking summary's order, then the closing review step: Personal info, Event info, DJ service, Rental services & equipment.
 return [definitions[0],...definitions.slice(1,4),definitions[4]].map(step=>({...step,fields:all.filter(field=>bookingStepForField(field.key)===step.id&&(!field.gate||getPath(order,field.gate)===true))}));
}
export function bookingIssueStep(order,issues){const keys=new Set(issues.map(issue=>typeof issue==='string'?issue:issue.key));return bookingSteps(order).find(step=>step.fields.some(field=>keys.has(field.key)))?.id||(keys.has('equipment')?'equipment':'references');}
export function firstIncompleteStep(order){return bookingIssueStep(order,missingOrderFields(order));}
export function missingViewportFields(order){return missingOrderFields(order).filter(field=>bookingStepForField(field.key)==='event');}
export const MC_NOTE='MC service requested';
export const djServiceChoice=order=>!order.services?.includes('dj')?'none':String(order.music?.djMc||'').split('\n').includes(MC_NOTE)?'dj_mc':'dj';
export function djServiceChanges(order,choice){
 return [{path:'music.djRequested',value:choice!=='none'}];
}

export function venueSelectionChanges(place,area){
 const fields={name:String(place.name||'').slice(0,160),address:String(place.address||'').slice(0,240),city:String(place.city||'').slice(0,80),postalCode:place.postalCode||'',country:place.country||'Canada',addressDetails:place.details||null,latitude:place.latitude??null,longitude:place.longitude??null,source:place.source||null,sourceId:place.sourceId||null,sourceAttribution:place.sourceAttribution||null,area};
 return Object.entries(fields).map(([key,value])=>({path:'event.venue.'+key,value}));
}
