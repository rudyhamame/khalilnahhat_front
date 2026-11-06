import {useEventOrder} from './eventOrderContext';
import {djServiceChoice,djServiceChanges} from '../lib/bookingFlow.mjs';
export default function DjBookingChoice({ar=false}){
 const ctx=useEventOrder(),choice=djServiceChoice(ctx.order);
 return <div className="draft-dj-choice" role="group" aria-label={ar?'خدمة الدي جي':'DJ service'}>{[['none','No DJ service','بدون خدمة دي جي'],['dj','Add DJ service','أضف خدمة الدي جي']].map(([id,en,arabic])=><button type="button" key={id} aria-pressed={ctx.order.music?.djRequested!==null&&choice===id} onClick={()=>djServiceChanges(ctx.order,id).forEach(({path,value})=>ctx.setField(path,value))}>{ar?arabic:en}</button>)}</div>;
}
