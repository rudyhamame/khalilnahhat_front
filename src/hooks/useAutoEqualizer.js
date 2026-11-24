import {useEffect,useRef} from 'react';
import {startAutoEqualizer} from '../lib/autoEqualizer';

export default function useAutoEqualizer({active,audioGraph,base,onChange,onStatus,stopRef}){
 const callbacks=useRef({onChange,onStatus});callbacks.current={onChange,onStatus};
 const original=useRef(base);if(!active)original.current=base;
 useEffect(()=>{
  if(!active)return;
  const stop=startAutoEqualizer({graph:audioGraph.current,base:original.current,onChange:values=>callbacks.current.onChange(values),onStatus:message=>callbacks.current.onStatus(message)});
  stopRef.current=stop;
  return ()=>{stop();if(stopRef.current===stop)stopRef.current=null;};
 },[active,audioGraph,stopRef]);
}
