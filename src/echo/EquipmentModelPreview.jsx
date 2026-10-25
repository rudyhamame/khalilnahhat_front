import {useEffect,useRef,useState} from 'react';
import {Download,Pause,Play,RotateCcw} from 'lucide-react';

export default function EquipmentModelPreview({src,name,ar}) {
  const viewer=useRef(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const [modelLoaded,setModelLoaded]=useState(false);
  const [rotate,setRotate]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tr=(en,arabic)=>ar?arabic:en;
  useEffect(()=>{
    let alive=true;
    import('@google/model-viewer').then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setError(ar?'تعذر تشغيل المعاينة ثلاثية الأبعاد.':'The 3D viewer could not load.');});
    return()=>{alive=false;};
  },[ar]);
  useEffect(()=>{
    const element=viewer.current;if(!element)return undefined;
    const failed=()=>setError(ar?'المجسم ثلاثي الأبعاد غير متاح بعد.':'The 3D model is not available yet.');
    const loaded=()=>{setModelLoaded(true);element.jumpCameraToGoal?.();};
    element.addEventListener('error',failed);element.addEventListener('load',loaded);if(element.loaded)loaded();
    return()=>{element.removeEventListener('error',failed);element.removeEventListener('load',loaded);};
  },[ready,ar]);
  return <div className="setup-model-preview">
    {ready&&!error?<model-viewer ref={viewer} src={src} alt={`${name} — ${tr('interactive 360-degree 3D model','مجسم تفاعلي بزاوية 360 درجة')}`} camera-controls="" auto-rotate={rotate?'':undefined} auto-rotate-delay="0" rotation-per-second="20deg" shadow-intensity="1" exposure="1" camera-orbit="-28deg 72deg auto" touch-action="pan-y" interaction-prompt="auto" loading="eager"/>:<p className="setup-model-status" role="status">{error||tr('Loading 3D preview…','جارٍ تحميل المجسم…')}</p>}
    {ready&&!modelLoaded&&!error&&<p className="setup-model-loading" role="status">{tr('Loading 3D model…','جارٍ تحميل المجسم…')}</p>}
    <div className="setup-model-toolbar"><span>360° / {tr('ILLUSTRATIVE 3D · DRAG TO EXPLORE','مجسم توضيحي · اسحب للاستكشاف')}</span><div><button type="button" onClick={()=>setRotate(value=>!value)} aria-label={rotate?tr('Pause rotation','إيقاف الدوران'):tr('Start rotation','تشغيل الدوران')} aria-pressed={rotate}>{rotate?<Pause size={14}/>:<Play size={14}/>}</button><button type="button" aria-label={tr('Reset 3D view','إعادة ضبط العرض')} onClick={()=>{if(viewer.current){viewer.current.cameraOrbit='-28deg 72deg auto';viewer.current.resetTurntableRotation?.(0);viewer.current.jumpCameraToGoal?.();}}}><RotateCcw size={14}/></button><a href={src} download aria-label={tr('Download 3D model','تنزيل المجسم')}><Download size={14}/></a></div></div>
  </div>;
}
