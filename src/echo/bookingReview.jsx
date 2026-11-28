import './eaAtomCode.css';
import {bookingFieldValue} from '../lib/bookingPresentation';
import {manualBookingFieldHref} from '../lib/bookingAtomReview';
import {fieldCode} from '../lib/eventPageModel';
import {Check,X,Pencil,MapPin} from 'lucide-react';
import {mapsLink} from '../lib/mapsLink';
import MusicPreferenceValue from './MusicPreferenceValue';
import ReferenceValue from './ReferenceValue';
export {draftValue,sectionLines} from '../lib/bookingReviewModel';
// The Booking review: every section's data atoms, grouped Entered / Needs attention / Optional. Used by Echo Smart Cart (Echo AI page),
// the concept map and the client dashboard's Booking draft, so all three show exactly the same thing.
// The DJ service belongs to its own section, so it is left out of Rental services & equipment.
// The data atoms of one section, grouped Entered / Needs attention / Optional. Booking review and the concept map both render exactly this.
function AtomReviewControls({line,tr,review}){
 if(!review?.onReview&&!review?.onEdit)return null;
 const state=review.stateFor?.(line);
 return <span className="ea-atom-controls" role="group" aria-label={`${tr('Review','مراجعة')} ${line.label}`}>
  {line.empty||state==='confirmed'||state==='editing'||!review.onReview?<button type="button" className="is-edit" disabled={review.disabled} aria-label={`${tr('Edit','تعديل')} ${line.label}`} title={tr('Edit this entry','تعديل هذه المعلومة')} onClick={()=>review.onEdit?review.onEdit(line):line.empty?window.location.assign(manualBookingFieldHref(line.reviewPath||line.key)):review.onReview(line,false)}><Pencil size={14} aria-hidden="true"/></button>:<>
   <button type="button" disabled={review.disabled} aria-label={`${tr('Confirm','تأكيد')} ${line.label}`} title={tr('Confirm this entry','تأكيد هذه المعلومة')} onClick={()=>review.onReview(line,true)}><Check size={14} aria-hidden="true"/></button>
   <button type="button" disabled={review.disabled} aria-pressed={state==='correction'} aria-label={`${tr('Correct','تصحيح')} ${line.label}`} title={tr('Ask Echo for a replacement or edit manually','اطلب بديلاً من إيكو أو عدّل يدوياً')} onClick={()=>review.onReview(line,false)}><X size={14} aria-hidden="true"/></button>
  </>}
 </span>;
}
function AtomValue({line,tr,table}){
 const ar=tr('en','ar')==='ar',raw=Object.hasOwn(line,'rawValue')?line.rawValue:line.reviewValue;
 const multiple=Array.isArray(raw)&&raw.length>1;
 if(Object.hasOwn(line,'rawValue'))return line.key.startsWith('references.')?<ReferenceValue path={line.key} value={raw} ar={ar} table={table||multiple}/>:<MusicPreferenceValue path={line.key} value={raw} ar={ar} table={table||multiple}/>;
 if(!multiple)return line.value;
 const equipment=line.key==='equipment';
 return <table className="mini-table" aria-label={line.label}><thead><tr><th scope="col" className="mini-num">#</th><th scope="col">{equipment?tr('Equipment','المعدات'):tr('Value','القيمة')}</th>{equipment&&<th scope="col">{tr('Qty','الكمية')}</th>}</tr></thead><tbody>{raw.map((item,index)=><tr key={index}><td className="mini-num">{index+1}</td><td dir="auto">{equipment&&item&&typeof item==='object'?item.name||item.id:bookingFieldValue({},line.key,ar,[item])}</td>{equipment&&<td>{item?.quantity??'—'}</td>}</tr>)}</tbody></table>;
}
export const AtomRow=({line,tr,review,table=false})=><>{line.category?<small className="ea-data-row" data-category="" data-field={line.key}><b>{line.label}</b></small>:<small className="ea-data-row" data-field={line.key} data-coded={fieldCode(line.key)||line.code?'':undefined} data-review={review?.stateFor?.(line)||undefined} data-music={Object.hasOwn(line,'rawValue')||Array.isArray(line.reviewValue)&&line.reviewValue.length>1?'':undefined} data-empty={line.empty?'':undefined}>{(fieldCode(line.key)||line.code)&&<i className="ea-atom-code">{fieldCode(line.key)||line.code}</i>}<b>{line.label}{line.key==='event.venue.address'&&!line.empty&&typeof line.value==='string'&&mapsLink(line.value)&&<a className="map-link" href={mapsLink(line.value)} target="_blank" rel="noopener noreferrer" aria-label={tr('Open the address in Google Maps','افتح العنوان في خرائط جوجل')} title={tr('Open in Google Maps','افتح في خرائط جوجل')} onClick={event=>event.stopPropagation()}><MapPin size={13} aria-hidden="true"/></a>}</b><span className="ea-data-value"><AtomValue line={line} tr={tr} table={table}/></span><AtomReviewControls line={line} tr={tr} review={review}/></small>}{line.items?.length>0&&<table className="ea-equipment-table"><thead><tr><th scope="col">{tr('Equipment','المعدات')}</th><th scope="col">{tr('Qty','الكمية')}</th><th scope="col">{tr('In stock','المتوفر')}</th>{review?.onReview&&<th scope="col"><span className="ai-booking-sr">{tr('Review','مراجعة')}</span></th>}</tr></thead><tbody>{line.items.map(item=><tr key={item.key} data-field={item.key} data-review={review?.stateFor?.(item)||undefined} data-empty={item.empty?'':undefined}><td>{item.code&&<i className="ea-atom-code">{item.code}</i>}{item.label}</td><td>{item.value}</td><td>{item.stock}</td>{review?.onReview&&<td><AtomReviewControls line={item} tr={tr} review={review}/></td>}</tr>)}</tbody></table>}</>;
export function AtomGroups({lines,progress,tr,wrap=null,atoms=false,review,table=false}){
 const groupOf=line=>line.group??(!line.empty?0:line.required?1:2);
 if(atoms&&wrap)return <>{lines.map(line=>{const group=groupOf(line);return wrap(<span className="ea-group" data-group={['entered','attention','optional'][group]}><AtomRow line={line} tr={tr} review={review} table={table}/></span>,group,line.key);})}</>;
 const groups=[[null,lines.filter(line=>groupOf(line)===0)],[tr('Needs attention','يحتاج انتباهك'),lines.filter(line=>groupOf(line)===1)],[tr('Optional','اختياري'),lines.filter(line=>groupOf(line)===2)]];
 const boxed=(node,group,key=group)=>wrap?wrap(node,group,key):node;
 return <>{groups.map(([title,rows],group)=>rows.length>0&&boxed(<span className="ea-group" data-group={['entered','attention','optional'][group]} key={group}>{title&&<em>{title}</em>}{!title&&lines.some(line=>groupOf(line)!==0)&&<em>{tr('Entered','تم إدخاله')}</em>}{rows.map(line=><AtomRow key={line.key} line={line} tr={tr} review={review} table={table}/>)}</span>,group,group))}{!lines.length&&boxed(<small className="ea-step-empty">{progress.missing.length?tr(`${progress.missing.length} to fill in`,`${progress.missing.length} للتعبئة`):tr('Optional','اختياري')}</small>,1,'empty')}</>;
}
