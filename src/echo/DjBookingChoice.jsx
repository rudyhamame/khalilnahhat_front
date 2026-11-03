import {useEventOrder} from './eventOrderContext';
import {djServiceChoice,djServiceChanges} from '../lib/bookingFlow.mjs';
export default function DjBookingChoice({ar=false}){
 const ctx=useEventOrder(),choice=djServiceChoice(ctx.order);
 return <div className="draft-dj-choice" role="group" aria-label={ar?'خدمة الدي جي والمذيع':'DJ and MC service'}>{[['none','No DJ service','بدون خدمة دي جي'],['dj','DJ service only','خدمة الدي جي فقط'],['dj_mc','DJ + MC service','خدمة الدي جي والمذيع']].map(([id,en,arabic])=><button type="button" key={id} aria-pressed={choice===id} onClick={()=>djServiceChanges(ctx.order,id).forEach(({path,value})=>ctx.setField(path,value))}>{ar?arabic:en}</button>)}</div>;
}
