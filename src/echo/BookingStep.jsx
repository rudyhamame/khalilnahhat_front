import './bookingCardHeaders.css';
import {RotateCcw} from 'lucide-react';

export default function BookingStep({number,title,copy,cardTitle,children,onReset,resetLabel,ResetIcon=RotateCcw,className=''}){
 return <section className={`booking-step ${number%2?'is-card-left':'is-card-right'}${className?` ${className}`:''}`} aria-labelledby={`booking-step-${number}`}>
  <div className={`booking-step-copy${typeof copy==='string'?'':' is-live'}`}><h2 id={`booking-step-${number}`}>{title}</h2><div key={typeof copy==='string'?'text':'live'} className="booking-copy-swap">{typeof copy==='string'?<p>{copy}</p>:copy}</div></div>
  <div className="booking-step-card"><h3 className="booking-card-title" aria-hidden={cardTitle?undefined:'true'}>{cardTitle}</h3>{onReset&&<button type="button" className="booking-reset" onClick={onReset.run} disabled={onReset.disabled} aria-label={`${resetLabel} · ${cardTitle}`}><ResetIcon size={14} aria-hidden="true"/>{resetLabel}</button>}{children}</div>
 </section>;
}
