import {loadModelViewer} from '../lib/modelViewer';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import './equipment3D.css';
export default function GeneratedModelViewer({src,name='Equipment',compact=false,ar=false}){
 const viewer=useRef(null),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;loadModelViewer().then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setError(ar?'تعذر فتح العرض ثلاثي الأبعاد.':'The 3D viewer could not load.');});return()=>{alive=false;};},[ar]);
 useEffect(()=>{
  setLoaded(false);setError('');if(!ready)return;
  const node=viewer.current;if(!node)return;
  const load=()=>setLoaded(true),fail=()=>setError(ar?'تعذر تحميل المجسم.':'The 3D model could not load.');
  node.addEventListener('load',load);node.addEventListener('error',fail);if(node.loaded)load();
  return()=>{node.removeEventListener('load',load);node.removeEventListener('error',fail);};
 },[src,ready,ar]);
 return <div className={'generated-model-viewer'+(compact?' is-compact':'')}>
  {ready&&<model-viewer ref={viewer} src={src} alt={name} camera-controls="" disable-pan="" touch-action="pan-y" environment-image="neutral" exposure="1.3" shadow-intensity="1" camera-orbit="-25deg 70deg 110%" interaction-prompt="auto"/>}
  {(!ready||!loaded)&&!error&&<p role="status">{ar?'جارٍ تحميل المجسم…':'Loading 3D model…'}</p>}{error&&<p role="alert">{error}</p>}
  {!compact&&<div className="generated-model-toolbar"><small>{ar?'اسحب للدوران · قرّب للتكبير':'Drag to rotate · Scroll to zoom'}</small><button type="button" aria-label={ar?'إعادة ضبط العرض':'Reset 3D view'} onClick={()=>{const node=viewer.current;if(node){node.cameraOrbit='-25deg 70deg 110%';node.cameraTarget='auto auto auto';node.jumpCameraToGoal?.();}}}><RotateCcw size={14}/></button></div>}
 </div>;
}
