import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ClipboardList} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {createEventOrder} from '../lib/eventOrderCore.mjs';
import {PUBLIC_PAGE_PATHS} from '../lib/publicPages';
import './bookingCart.css';

const leaves=value=>value&&typeof value==='object'?Object.entries(value).reduce((sum,[key,child])=>sum+(key==='timezone'?0:leaves(child)),0):1;
const BLANK_EVENT=createEventOrder().event;

// Anything entered counts: event type, date, times, guests, venue and the rest, as well as services and equipment.
const filled=value=>value&&typeof value==='object'?Object.entries(value).reduce((total,[key,child])=>total+(key==='timezone'?0:filled(child)),0):(value===null||value===undefined||value===''||value===false?0:1);
export function bookingProgress(order){
 const services=order?.services||[],items=order?.equipment||[],count=services.length+items.length+filled(order?.event);
 return {count,total:Math.max(count,leaves(BLANK_EVENT)+services.length+items.length)};
}

// Header "Booking n/total" button. The data atoms live in one place only: the Booking review column on the Echo AI page.
export default function BookingCart({ar=false}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const [slot,setSlot]=useState(null);
 useEffect(()=>{setSlot(document.getElementById('echo-header-cart'));},[]);
 const order=ctx?.order;
 const {count,total}=bookingProgress(order);
 if(!count&&!slot)return null;
 const inNav=Boolean(slot?.closest('.echo-header-nav'));
 return createPortal(<div className={`home-booking-cart${slot?' is-in-header':''}${count?'':' is-empty'}`} dir={ar?'rtl':'ltr'}><a href={PUBLIC_PAGE_PATHS.booking} className={inNav?'echo-header-nav-button':'home-booking-cart-button echo-icon-button'} aria-label={`${tr('Booking review','مراجعة الحجز')} · ${count}/${total}`} data-tooltip={tr('Booking review','مراجعة الحجز')}><ClipboardList size={20} strokeWidth={1.8} aria-hidden="true"/>{inNav&&<span aria-hidden="true">{tr('Booking','الحجز')}</span>}{count>0&&<span className="booking-cart-count" aria-hidden="true">{count}/{total}</span>}</a></div>,slot||document.body);
}
