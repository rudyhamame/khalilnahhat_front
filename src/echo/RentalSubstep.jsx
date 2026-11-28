import {Boxes} from 'lucide-react';

// The rental equipment list, framed exactly like the DJ service's sub-step (Music Preferences): a connector line, a node, a kicker, a title and the content below.
export default function RentalSubstep({ar=false,children}){
 const tr=(en,arabic)=>ar?arabic:en;
 return <div className="dj-substep booking-services" id="rental-substep" dir={ar?'rtl':'ltr'}>
  <header className="dj-substep-head">
   <span className="dj-substep-node" aria-hidden="true"><Boxes size={18}/></span>
   <div>
    <p className="dj-substep-kicker">{tr('SUB-STEP OF RENTAL EQUIPMENT SERVICE','خطوة فرعية ضمن خدمة معدات التأجير')}</p>
    <h3>{tr('Rental Equipment','معدات التأجير')}</h3>
    <p>{tr('Choose the equipment for your event: every category with all of its equipment.','اختر المعدات لفعاليتك: كل فئة مع جميع معداتها.')}</p>
   </div>
  </header>
  <section className="dj-prefs-section" aria-label={tr('Rental equipment','معدات التأجير')}>{children}</section>
 </div>;
}
