import {GitBranch} from 'lucide-react';
import journey from '../lib/bookingJourneyContract.json' with {type:'json'};
import './bookingJourneyTree.css';

const stage=key=>journey.clientStages[key]||{label:key};
// Substeps hang under the step they follow. Everything here comes from the shared booking-journey contract; nothing is typed twice.
const BELOW={
 requested:[{key:'modified',note:'The client edited the booking. It shows this until the team confirms availability or sends a quote again.'}],
 available:[{key:'unavailable',note:'Instead of “available”: the date cannot be taken. The client may discuss it or suggest another date.'}],
 quote_ready:journey.branches.decisions.stages.map(key=>({key,parallel:true,note:key==='quote_accepted'?'The client accepts the quote. The deposit then confirms the booking.':'The client asks for a better price or other changes. The team sends a revised quote.'})),
};
const Node=({code,title,sub,tag,tone})=><li className={`bjt-node${tone?` is-${tone}`:''}`}><span className="bjt-code">{code}</span><div><strong>{title}</strong>{tag&&<em>{tag}</em>}{sub&&<p>{sub}</p>}</div></li>;
export default function BookingJourneyTree(){
 const path=journey.clientPath,cancel=stage(journey.branches.cancel.stage);
 return <article className="booking-journey-tree" aria-labelledby="bjt-title">
  <header className="bat-header"><p><GitBranch size={16} aria-hidden="true"/> ECHO DOCS</p><h1 id="bjt-title">Booking Journey Tree</h1><p>The steps a booking goes through, with the substeps and branches beside them. Generated from the shared booking-journey contract; the status the client and the admin see is one of these.</p></header>
  <ol className="bjt-tree">{path.map((key,index)=>{const s=stage(key),n=String(index+1).padStart(2,'0');
   return <li key={key} className="bjt-step"><div className="bjt-main"><span className="bjt-code">{n}</span><div><strong>{s.label}</strong>{s.adminLabel&&s.adminLabel!==s.label&&<em>Admin sees: {s.adminLabel}</em>}{s.clientNext&&<p>Client next: {s.clientNext.replaceAll('_',' ')}</p>}</div></div>
    {BELOW[key]&&<>{BELOW[key].some(item=>item.parallel)&&<p className="bjt-parallel">Parallel · the client does one or the other</p>}<ul className="bjt-sub">{BELOW[key].map((item,i)=><Node key={item.key} code={`${n}.${String(i+1).padStart(2,'0')}`} title={stage(item.key).label} sub={item.note} tag={item.parallel?'parallel':'substep'}/>)}</ul></>}
    <ul className="bjt-sub"><Node code={`${n}.x`} title={cancel.label} tone="cancel" tag="any step" sub={index===0?'Possible after ANY step above: the client cancels and the journey stops there. It is shown branching off the step where it happened.':undefined}/></ul>
   </li>;})}</ol>
  <section className="bjt-statuses"><h2>Lifecycle statuses behind the steps</h2><table><thead><tr><th>Status</th><th>Shown as</th><th>Who acts next</th><th>Facts</th></tr></thead><tbody>
   {Object.entries(journey.statuses).map(([key,s])=><tr key={key}><td><code>{key}</code></td><td>{s.label}</td><td>{s.whoActsNext}</td><td>{s.facts.join(', ')}</td></tr>)}</tbody></table></section>
 </article>;
}
