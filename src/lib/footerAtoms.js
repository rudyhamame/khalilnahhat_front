import {treeAtomProgress,isEquipmentAtom} from './treeAtoms.js';
import {effectiveMissing} from './bookingNextStep.js';
import {fieldName,getPath,isAnswered} from './eventOrderCore.mjs';
import {fieldCode} from './eventPageModel.js';

// What the Booking footer points at next, shared with Echo AI so both ask in the same order: every required atom first, then the optional ones.
export const NAMES={'music.languagePairs':['Language & dialect','اللغة واللهجة'],'music.genres':['Music genres','الأنواع الموسيقية'],'music.suggestedSongs':['Songs for event moments','أغانٍ للحظات الفعالية'],'music.favouriteSongs':['Favourite songs','الأغاني المفضلة'],'music.favouriteArtists':['Favourite artists','الفنانون المفضلون'],'services':['Rental services','خدمات التأجير'],'equipment':['Rental equipment','معدات التأجير'],'references.photos':['Inspiration photos','صور ملهمة'],'references.images':['Inspiration photo links','روابط صور ملهمة'],'additional.notes':['Additional notes','ملاحظات إضافية'],'additional.voucherCode':['Voucher','القسيمة']};
export const answered=(order,key)=>key==='equipment'?order?.equipment?.length>0:isAnswered(getPath(order,key));
export const byPage=(a,b)=>(fieldCode(a)||'99').localeCompare(fieldCode(b)||'99');
export const nextRequiredKey=order=>effectiveMissing(order).map(field=>field.key).filter(key=>key!=='services').sort(byPage)[0];
export const nextOptionalKey=(order,skip=()=>false)=>treeAtomProgress(order).filter(atom=>!atom.required&&!atom.done&&!skip(atom.key)).sort((a,b)=>a.code.localeCompare(b.code)).map(atom=>isEquipmentAtom(atom.key)?'equipment':atom.key)[0];
export const atomLabel=(key,ar=false)=>NAMES[key]?NAMES[key][ar?1:0]:fieldName(key,ar)||key;
