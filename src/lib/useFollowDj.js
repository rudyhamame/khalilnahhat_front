import {useEffect,useRef,useState} from 'react';
import {loadFaceDetector,detectFaces,splitPeople} from './faces.js';
// Auto crop for the portrait window: its own face detection on the landscape preview (independent of the blur feature),
// with its own DJ pick made in the portrait window. Nothing steers the crop until the DJ's face is clicked.
export function useFollowDj({enabled,getVideo,onSteer}){
 const [follow,setFollow]=useState(false),[pick,setPick]=useState(false),[boxes,setBoxes]=useState([]),[dj,setDj]=useState(null),[error,setError]=useState(''),
  anchor=useRef(null),chosen=useRef(false),pan=useRef(null),steer=useRef(onSteer),video=useRef(getVideo);
 steer.current=onSteer;video.current=getVideo;
 const toggle=()=>{if(follow){setFollow(false);return;}anchor.current=null;chosen.current=false;pan.current=null;setDj(null);setPick(true);setFollow(true);};
 const choose=box=>{anchor.current={cx:box.cx,cy:box.cy,w:box.w,score:box.score};chosen.current=true;pan.current=null;setDj(anchor.current);setPick(false);};
 useEffect(()=>{
  if(!follow||!enabled){setBoxes([]);return undefined;}
  let dead=false,timer=0,state={lost:0};
  const tick=detector=>{
   if(dead)return;
   const v=video.current?.();
   if(v&&v.videoWidth&&v.readyState>1){
    try{
     const w=v.videoWidth,h=v.videoHeight,found=detectFaces(detector,v,w,h);if(!chosen.current)setBoxes(found);
     if(chosen.current){
      const result=splitPeople(found,anchor.current,state);state=result.state;anchor.current=result.anchor;
      const cw=9/16/(w/h);
      // Only while the DJ is matched: another face never steers the crop.
      if(cw<1&&state.lost===0){const target=Math.max(0,Math.min(1,(result.anchor.cx-cw/2)/(1-cw)));pan.current=pan.current===null?target:pan.current+(target-pan.current)*.25;steer.current?.(pan.current);}
     }
    }catch{/* skip this detection */}
   }
   timer=setTimeout(()=>tick(detector),150);
  };
  loadFaceDetector().then(tick).catch(()=>{if(!dead){setError('Face detection could not load.');setFollow(false);}});
  return()=>{dead=true;clearTimeout(timer);};
 },[follow,enabled]);
 return {follow,setFollow,pick,boxes,dj,error,toggle,choose};
}
