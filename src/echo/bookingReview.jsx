export {draftValue,sectionLines} from '../lib/bookingReviewModel';
// The Booking review: every section's data atoms, grouped Entered / Needs attention / Optional. Used by Echo Smart Cart (Echo AI page),
// the concept map and the client dashboard's Booking draft, so all three show exactly the same thing.
// The DJ service belongs to its own section, so it is left out of Rental services & equipment.
// The data atoms of one section, grouped Entered / Needs attention / Optional. Booking review and the concept map both render exactly this.
export const AtomRow=({line,tr})=><><small className="ea-data-row" data-field={line.key} data-empty={line.empty?'':undefined}><b>{line.label}</b><span className="ea-data-value">{line.value}</span></small>{line.items?.length>0&&<table className="ea-equipment-table"><thead><tr><th scope="col">{tr('Equipment','المعدات')}</th><th scope="col">{tr('Qty','الكمية')}</th></tr></thead><tbody>{line.items.map(item=><tr key={item.key} data-field={item.key} data-empty={item.empty?'':undefined}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>}</>;
export function AtomGroups({lines,progress,tr,wrap=null,atoms=false}){
 const groupOf=line=>line.group??(!line.empty?0:line.required?1:2);
 if(atoms&&wrap)return <>{lines.map(line=>{const group=groupOf(line);return wrap(<span className="ea-group" data-group={['entered','attention','optional'][group]}><AtomRow line={line} tr={tr}/></span>,group,line.key);})}</>;
 const groups=[[null,lines.filter(line=>groupOf(line)===0)],[tr('Needs attention','يحتاج انتباهك'),lines.filter(line=>groupOf(line)===1)],[tr('Optional','اختياري'),lines.filter(line=>groupOf(line)===2)]];
 const boxed=(node,group,key=group)=>wrap?wrap(node,group,key):node;
 return <>{groups.map(([title,rows],group)=>rows.length>0&&boxed(<span className="ea-group" data-group={['entered','attention','optional'][group]} key={group}>{title&&<em>{title}</em>}{!title&&lines.some(line=>groupOf(line)!==0)&&<em>{tr('Entered','تم إدخاله')}</em>}{rows.map(line=><AtomRow key={line.key} line={line} tr={tr}/>)}</span>,group,group))}{!lines.length&&boxed(<small className="ea-step-empty">{progress.missing.length?tr(`${progress.missing.length} to fill in`,`${progress.missing.length} للتعبئة`):tr('Optional','اختياري')}</small>,1,'empty')}</>;
}
