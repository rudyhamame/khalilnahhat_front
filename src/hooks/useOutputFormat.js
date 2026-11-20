import {useCallback,useState} from 'react';
import {normalizeFormat} from '../lib/outputFormat';
// The live's output ratio (Landscape or Portrait), remembered in this browser. The picture itself is composed in OBS.
export function useOutputFormat(){
  const [format,setFormatState]=useState(()=>{try{const saved=normalizeFormat(localStorage.getItem('echo-output-format'));return saved==='portrait'?'portrait':'landscape';}catch{return 'landscape';}});
  const setFormat=useCallback(value=>{const next=normalizeFormat(value)==='portrait'?'portrait':'landscape';setFormatState(next);try{localStorage.setItem('echo-output-format',next);}catch{/* Session choice still works. */}},[]);
  return {format,setFormat,nativePortrait:format==='portrait'};
}
