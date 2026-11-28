import {useEffect,useState} from 'react';
import {atomReviewState,currentAtomReviews,reviewBookingAtom,editBookingAtom} from '../lib/bookingAtomReview';

const read=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};
// Entries confirmed as a visitor carry over to the account created afterwards (the draft id can change when the account claims the draft); currentAtomReviews drops any whose value has changed since.
const guestReviews=()=>{const merged={};try{for(let i=0;i<localStorage.length;i++){const name=localStorage.key(i);if(name?.startsWith('echo-atom-review:v1:guest:'))Object.assign(merged,read(name));}}catch{/* Storage is optional. */}return merged;};
const load=(owner,draftId,key)=>owner?{...guestReviews(),...read(key)}:read(key);
export default function useBookingAtomReview(owner,draftId,lines,ready=true){
 const key=`echo-atom-review:v1:${owner||'guest'}:${draftId}`;
 const [stored,setStored]=useState(()=>({key,reviews:load(owner,draftId,key)}));
 const saved=stored.key===key?stored.reviews:load(owner,draftId,key);
 const reviews=ready?currentAtomReviews(saved,lines):saved;
 const serialized=JSON.stringify(reviews);
 useEffect(()=>{
  if(!ready)return;
  setStored({key,reviews:JSON.parse(serialized)});
  try{localStorage.setItem(key,serialized);}catch{/* The current review remains usable without storage. */}
 },[key,serialized,ready]);
 return {stateFor:line=>atomReviewState(reviews,line),review:(line,confirmed)=>setStored({key,reviews:reviewBookingAtom(reviews,line,confirmed)}),edit:line=>setStored({key,reviews:editBookingAtom(reviews,line)})};
}
