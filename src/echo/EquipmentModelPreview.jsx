import {loadModelViewer} from '../lib/modelViewer';
import {useEffect,useRef,useState} from 'react';
import {Download,Pause,Play,RotateCcw} from 'lucide-react';
import {EQUIPMENT_MODELS} from './equipmentModels';

export default function EquipmentModelPreview({equipmentId='es18p',name,ar}) {
  const model=EQUIPMENT_MODELS[equipmentId];
  const [part,setPart]=useState(0),src=model.parts?model.parts[part].src:model.src;
  const viewer=useRef(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const [modelLoaded,setModelLoaded]=useState(false);
  const [rotate,setRotate]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tr=(en,arabic)=>ar?arabic:en;
  useEffect(()=>{
    let alive=true;
    loadModelViewer().then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setError(ar?'تعذر تشغيل المعاينة ثلاثية الأبعاد.':'The 3D viewer could not load.');});
    return()=>{alive=false;};
  },[ar]);
  useEffect(()=>{
    const element=viewer.current;if(!element)return undefined;
    const failed=()=>setError(ar?'المجسم ثلاثي الأبعاد غير متاح بعد.':'The 3D model is not available yet.');
    const loaded=()=>{setModelLoaded(true);element.updateFraming().then(()=>element.jumpCameraToGoal()).catch(()=>{});};
    element.addEventListener('error',failed);element.addEventListener('load',loaded);if(element.loaded)loaded();
    return()=>{element.removeEventListener('error',failed);element.removeEventListener('load',loaded);};
  },[ready,ar]);
  return <div className="setup-model-preview setup-model-spec-board">
    <div className="setup-model-identity"><span>{model.brand}</span><strong>{model.model}</strong><small>{model.subtitle[ar?1:0]}</small></div>
    {model.specs.map(spec=><dl key={spec.key} className={`setup-model-spec spec-${spec.key}`}><dt>{spec.label[ar?1:0]}</dt><dd dir={ar&&spec.arabicValue?'rtl':'ltr'}>{ar&&spec.arabicValue?spec.arabicValue:spec.value}</dd><dd className="setup-model-spec-detail">{spec.detail[ar?1:0]}</dd></dl>)}
    <div className="setup-model-center">

    {ready&&!error?<model-viewer ref={viewer} src={src} alt={`${name} — ${tr('interactive 360-degree 3D model','مجسم تفاعلي بزاوية 360 درجة')}`} camera-controls="" disable-pan="" auto-rotate={rotate?'':undefined} auto-rotate-delay="0" rotation-per-second="20deg" shadow-intensity="1" exposure="2" environment-image="neutral" camera-orbit={model.cameraOrbit||'-28deg 72deg 95%'} touch-action="pan-y" interaction-prompt="auto" loading="eager"/>:<p className="setup-model-status" role="status">{error||tr('Loading 3D preview…','جارٍ تحميل المجسم…')}</p>}
    {ready&&!modelLoaded&&!error&&<p className="setup-model-loading" role="status">{tr('Loading 3D model…','جارٍ تحميل المجسم…')}</p>}
    {model.parts&&<div className="setup-model-parts" role="group" aria-label={tr('Set pieces','قطع المجموعة')}>{model.parts.map((p,i)=><button type="button" key={p.key} aria-pressed={i===part} onClick={()=>setPart(i)}>{p.label[ar?1:0]}</button>)}</div>}
    <div className="setup-model-toolbar"><div><button type="button" onClick={()=>setRotate(value=>!value)} aria-label={rotate?tr('Pause rotation','إيقاف الدوران'):tr('Start rotation','تشغيل الدوران')} aria-pressed={rotate}>{rotate?<Pause size={14}/>:<Play size={14}/>}</button><button type="button" aria-label={tr('Reset 3D view','إعادة ضبط العرض')} onClick={()=>{if(viewer.current){viewer.current.cameraTarget='auto auto auto';viewer.current.cameraOrbit=model.cameraOrbit||'-28deg 72deg 95%';viewer.current.resetTurntableRotation?.(0);viewer.current.jumpCameraToGoal?.();}}}><RotateCcw size={14}/></button><a href={src} download aria-label={tr('Download 3D model','تنزيل المجسم')}><Download size={14}/></a></div></div>
    </div>
  </div>;
}
