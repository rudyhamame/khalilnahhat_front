// The one place the Booking Tree's rules (required, max length, allowed values) enter the app.
// Every page loads them once at start-up; the admin tree publishes new ones through setBookingRules.
import {useSyncExternalStore} from 'react';
import {apiRequest} from './api';
import {applyBookingRules} from './eventOrderCore.mjs';
let version=0,loading=null;const listeners=new Set();
const publish=rules=>{applyBookingRules(rules||{});version++;listeners.forEach(listener=>listener());};
export const setBookingRules=publish;
export function loadBookingRules(){return loading||(loading=apiRequest('/booking-rules').then(({rules})=>publish(rules)).catch(()=>{loading=null;}));}
// Re-renders a component whenever the rules change.
export const useBookingRules=()=>useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>version,()=>version);
