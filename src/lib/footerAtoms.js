import {atomMounted,treeSteps} from './treeCore.js';
import {effectiveMissing} from './bookingNextStep.js';
import {fields,fieldName,getPath,isAnswered} from './eventOrderCore.mjs';
import {ATOM_KEYS,fieldCode} from './eventPageModel.js';

// What the Booking footer points at next, shared with Echo AI so both ask in the same order: every required atom first, then the optional ones.
export const NAMES={'music.languagePairs':['Language & dialect','اللغة واللهجة'],'music.genres':['Music genres','الأنواع الموسيقية'],'music.suggestedSongs':['Songs for event moments','أغانٍ للحظات الفعالية'],'music.favouriteSongs':['Favourite songs','الأغاني المفضلة'],'music.favouriteArtists':['Favourite artists','الفنانون المفضلون'],'services':['Rental services','خدمات التأجير'],'equipment':['Rental equipment','معدات التأجير'],'references.photos':['Inspiration photos','صور ملهمة'],'references.images':['Inspiration photo links','روابط صور ملهمة'],'additional.notes':['Additional notes','ملاحظات إضافية'],'additional.voucherCode':['Voucher','القسيمة']};
export const SKIP=new Set(['event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution','event.title','event.setup.requirements','services']);
export const stepOfKey=key=>parseInt(String(fieldCode(key)||'').slice(0,2),10);
export const REQUIRED_KEYS=n=>[...new Set([...fields.filter(field=>field.required&&parseInt(String(fieldCode(field.key)||'').slice(0,2),10)===n).map(field=>field.key).filter(key=>!['rental.requested','services'].includes(key)),...(n===3?['music.djRequested','music.mcRequested']:[])])];
export const REQUIRED_ALL=new Set([1,2,3,4].flatMap(REQUIRED_KEYS));
export const answered=(order,key)=>key==='equipment'?order?.equipment?.length>0:isAnswered(getPath(order,key));
export const byPage=(a,b)=>(fieldCode(a)||'99').localeCompare(fieldCode(b)||'99');
export const nextRequiredKey=order=>effectiveMissing(order).map(field=>field.key).filter(key=>key!=='services').sort(byPage)[0];
export const nextOptionalKey=(order,skip=()=>false)=>ATOM_KEYS.filter(key=>!SKIP.has(key)&&!REQUIRED_ALL.has(key)&&atomMounted(fieldCode(key),treeSteps())).sort(byPage).find(key=>!answered(order,key)&&!skip(key));
export const atomLabel=(key,ar=false)=>NAMES[key]?NAMES[key][ar?1:0]:fieldName(key,ar)||key;
