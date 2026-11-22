import {RotateCcw} from 'lucide-react';

// STEP.SEC label of each numbered step: 01 = Personal info, 02 = Event info, 03 = DJ Khalil Service, 04 = Services info, 05 = Additional info.
const STEP_LABELS={1:'01.01',2:'02.01',3:'02.02',4:'02.03',5:'02.04',6:'03.01',7:'04.01',8:'05.01',9:'05.02',10:'03.02',11:'03.03',12:'03.04',13:'03.05',14:'03.06',15:'03.07'};
export default function BookingStep({number,title,copy,cardTitle,children,onReset,resetLabel,ResetIcon=RotateCcw,className='',showNumber=true,code}){
 return <section className={`booking-step ${number%2?'is-card-left':'is-card-right'}${className?` ${className}`:''}`} aria-labelledby={`booking-step-${number}`}>
  <div className={`booking-step-copy${typeof copy==='string'?'':' is-live'}`}>{showNumber&&<span className="booking-step-number">{code||STEP_LABELS[number]||String(number).padStart(2,'0')}</span>}<h2 id={`booking-step-${number}`}>{title}</h2><div key={typeof copy==='string'?'text':'live'} className="booking-copy-swap">{typeof copy==='string'?<p>{copy}</p>:copy}</div></div>
  <div className="booking-step-card"><h3 className="booking-card-title" aria-hidden={cardTitle?undefined:'true'}>{cardTitle}</h3>{onReset&&<button type="button" className="booking-reset" onClick={onReset.run} disabled={onReset.disabled} aria-label={`${resetLabel} · ${cardTitle}`}><ResetIcon size={14} aria-hidden="true"/>{resetLabel}</button>}{children}</div>
 </section>;
}
