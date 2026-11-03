import {useEffect,useState} from 'react';
import GeneratedModelViewer from '../components/GeneratedModelViewer';

// Keep all pieces in one model so orbit, zoom and reset frame the complete set.
export default function EquipmentSetViewer({parts,name,ar=false}){
  const [src,setSrc]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true,url='';
    setSrc('');setFailed(false);
    import('./equipmentSetModel').then(({createEquipmentSetModel})=>createEquipmentSetModel(parts)).then(blob=>{
      if(!alive)return;
      url=URL.createObjectURL(blob);setSrc(url);
    }).catch(()=>{if(alive)setFailed(true);});
    return()=>{alive=false;if(url)URL.revokeObjectURL(url);};
  },[parts,attempt]);
  if(src)return <GeneratedModelViewer src={src} name={name} ar={ar} showInteractionHint={false} fitToBounds/>;
  return <div className="rental-set-status" role={failed?'alert':'status'}><p>{failed?(ar?'تعذر تحميل المجموعة كاملة.':'The complete set could not load.'):(ar?'جارٍ تحميل المجموعة كاملة…':'Loading complete equipment set…')}</p>{failed&&<button type="button" onClick={()=>setAttempt(value=>value+1)}>{ar?'إعادة المحاولة':'Retry'}</button>}</div>;
}
