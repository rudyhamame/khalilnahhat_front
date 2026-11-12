import {useEffect,useState} from 'react';
// Finds a DOM slot by id and follows it when React re-creates it (hot reload, remount), so portals never point at a detached node.
export function useDomSlot(id){
 const [slot,setSlot]=useState(null);
 useEffect(()=>{
  const find=()=>setSlot(current=>{const element=document.getElementById(id);return element===current?current:element;});
  find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[id]);
 return slot;
}
