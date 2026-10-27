import {useEffect,useRef,useState} from 'react';
import {isAssistantAudible,speechFeatures,speechMorphs} from '../lib/voiceAvatarMotion';
import './voiceAvatar.css';

const MODEL='/echo/models/echo-assistant-v1.glb';
function disposeModel(root){
  const materials=new Set(),textures=new Set();
  root?.traverse(node=>{node.geometry?.dispose();for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);});
  for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}
  for(const texture of textures){texture.source?.data?.close?.();texture.dispose();}
}

export default function EchoVoiceAvatar({motion,call='idle',ar=false}){
  const host=useRef(null),phase=useRef(call);
  const [status,setStatus]=useState('loading');
  useEffect(()=>{phase.current=call;},[call]);
  useEffect(()=>{
    const element=host.current,controller=new AbortController();
    let cancelled=false,renderer,root,observer,intersection,frame=0,visible=true;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const run=async()=>{
      try{
        const [THREE,{GLTFLoader}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js')]);
        if(cancelled)return;
        renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
        renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
        element.appendChild(renderer.domElement);
        const scene=new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xe9f1ff,0x434052,2));
        const key=new THREE.DirectionalLight(0xfff0df,3.2);key.position.set(2,3,4);scene.add(key);
        const fill=new THREE.DirectionalLight(0xd6e5ff,1.6);fill.position.set(-3,1,2);scene.add(fill);
        const rim=new THREE.DirectionalLight(0x92c5d7,2);rim.position.set(1,2,-3);scene.add(rim);
        const camera=new THREE.PerspectiveCamera(32,1,.01,100);
        const response=await fetch(MODEL,{signal:controller.signal});if(!response.ok)throw new Error('Avatar asset unavailable');
        const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/echo/models/');
        root=gltf.scene;
        if(cancelled){disposeModel(root);return;}
        root.updateMatrixWorld(true);
        let bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
        root.scale.multiplyScalar(2/Math.max(size.y,.01));root.updateMatrixWorld(true);
        bounds=new THREE.Box3().setFromObject(root);const center=bounds.getCenter(new THREE.Vector3());
        root.position.x-=center.x;root.position.y-=bounds.min.y;root.position.z-=center.z;root.updateMatrixWorld(true);
        scene.add(root);
        const bones={},morphMeshes=[];
        root.traverse(node=>{
          if(node.isBone)bones[node.name.replace(/^ludovisions_FC1_/,'')]=node;
          if(node.morphTargetDictionary)morphMeshes.push(node);
          if(node.isMesh)node.frustumCulled=false;
        });
        // Relax the supplied A-pose without destroying the original bind pose.
        const direction=new THREE.Vector3(),currentQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),delta=new THREE.Quaternion();
        const relax=(name,childName,x,y,z)=>{
          const bone=bones[name],child=bones[childName];if(!bone||!child)return;
          const a=bone.getWorldPosition(new THREE.Vector3()),b=child.getWorldPosition(new THREE.Vector3());
          direction.copy(b).sub(a).normalize();delta.setFromUnitVectors(direction,new THREE.Vector3(x,y,z).normalize());
          bone.getWorldQuaternion(currentQ);bone.parent.getWorldQuaternion(parentQ);
          bone.quaternion.copy(parentQ.invert().multiply(delta.multiply(currentQ)));root.updateMatrixWorld(true);
        };
        for(const side of ['L','R']){
          const sign=(bones[side+'_Upperarm']?.getWorldPosition(new THREE.Vector3()).x||0)>=0?1:-1;
          relax(side+'_Upperarm',side+'_Forearm',sign*.18,-1,.08);
          relax(side+'_Forearm',side+'_Hand',sign*.05,-1,.22);
        }
        const rest=new Map();for(const bone of Object.values(bones))rest.set(bone,bone.quaternion.clone());
        const head=bones.Head?.getWorldPosition(new THREE.Vector3())||new THREE.Vector3(0,1.75,0);
        // Tight conversational portrait: head, shoulders and upper chest only.
        const viewTarget=new THREE.Vector3(0,head.y-.12,0);
        camera.position.set(0,viewTarget.y,1.15);camera.lookAt(viewTarget);
        observer=new ResizeObserver(()=>{
          const rect=element.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
          camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);
        });observer.observe(element);
        intersection=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;});intersection.observe(element);
        const offset=new THREE.Quaternion(),euler=new THREE.Euler();
        const rotate=(name,x=0,y=0,z=0)=>{const bone=bones[name];if(bone)bone.quaternion.copy(rest.get(bone)).multiply(offset.setFromEuler(euler.set(x,y,z)));};
        let previous=performance.now(),rendered=0,elapsed=0,nextBlink=2.6,blinkStart=-10,blinkIndex=0,level=0,nod=0,lastLevel=0;
        let timeData,frequencyData,analyserSeen;
        const render=now=>{
          if(cancelled)return;
          frame=requestAnimationFrame(render);
          if(!visible||document.hidden||now-rendered<1000/30)return;
          const dt=Math.min((now-previous)/1000,.08);previous=now;rendered=now;elapsed+=dt;
          const state=motion.current||{},analyser=state.analyser;
          if(analyser&&analyser!==analyserSeen){timeData=new Float32Array(analyser.fftSize);frequencyData=new Uint8Array(analyser.frequencyBinCount);analyserSeen=analyser;}
          const playing=isAssistantAudible(state,phase.current);
          if(playing&&analyser){analyser.getFloatTimeDomainData(timeData);analyser.getByteFrequencyData(frequencyData);}
          const features=speechFeatures(timeData,frequencyData,analyser?.context?.sampleRate||48000,!!playing&&!!analyser);
          level+=(features.level-level)*(1-Math.exp(-dt*18));
          if(features.level-lastLevel>.055)nod=Math.min(1,nod+(features.level-lastLevel)*2);lastLevel=features.level;nod*=Math.exp(-dt*5);
          if(elapsed>=nextBlink){blinkStart=elapsed;blinkIndex++;nextBlink=elapsed+2.9+(blinkIndex%4)*.63;}
          const blinkAge=elapsed-blinkStart,blink=blinkAge>=0&&blinkAge<.18?Math.sin(blinkAge/.18*Math.PI):0;
          const brow=state.gesture==='question'&&playing ? .12 : level*.035;
          const targets={...speechMorphs(features),Eye_Blink_L:blink,Eye_Blink_R:blink,Mouth_Smile_L:.035,Mouth_Smile_R:.035,Brow_Raise_Inner_L:brow,Brow_Raise_Inner_R:brow};
          for(const mesh of morphMeshes){
            for(const [name,index] of Object.entries(mesh.morphTargetDictionary)){
              const target=targets[name]||0;
              mesh.morphTargetInfluences[index]+=(target-mesh.morphTargetInfluences[index])*(1-Math.exp(-dt*(name.startsWith('Eye_Blink')?40:24)));
            }
          }
          if(!reduced.matches){
            const breath=Math.sin(elapsed*1.5)*.008,emphasis=Math.min(.12,nod*.1);
            rotate('Spine02',breath,Math.sin(elapsed*.45)*.008,Math.sin(elapsed*.7)*.006);
            rotate('Head',-.015+emphasis*.32,Math.sin(elapsed*.55)*.018,(state.listening ? .035 : 0)+(playing&&state.gesture==='question' ? .03 : 0));
            rotate('NeckTwist02',breath*.4,Math.sin(elapsed*.35)*.008,0);
            rotate('R_Upperarm',-level*.08,0,emphasis*.35);
            rotate('R_Forearm',-level*.2,level*.08,0);
            rotate('L_Upperarm',-level*.04,0,-emphasis*.15);
            rotate('L_Forearm',-level*.09,0,0);
          }
          element.dataset.speaking=features.level>0?'true':'false';element.dataset.mouth=features.open.toFixed(3);
          renderer.render(scene,camera);
        };
        element.dataset.rigged=String(Object.keys(bones).length>0);
        element.dataset.speechMorphs=String(morphMeshes.some(mesh=>'V_Open' in mesh.morphTargetDictionary));
        setStatus('ready');frame=requestAnimationFrame(render);
      }catch(error){if(!cancelled&&error.name!=='AbortError')setStatus('error');}
    };
    run();
    return()=>{cancelled=true;controller.abort();cancelAnimationFrame(frame);observer?.disconnect();intersection?.disconnect();disposeModel(root);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
  },[motion]);
  return <div className="echo-voice-avatar" data-status={status}>
    <div className="echo-voice-avatar-canvas" ref={host} role="img" aria-label={ar?'شخصية إيكو الافتراضية المتحركة أثناء المكالمة':'Animated Echo virtual assistant for the voice call'}/>
    {status==='loading'&&<span className="echo-voice-avatar-status" role="status">{ar?'جارٍ تجهيز الشخصية…':'Preparing your assistant…'}</span>}
    {status==='error'&&<span className="echo-voice-avatar-status" role="status">{ar?'تعذر عرض الشخصية. المكالمة الصوتية ما زالت متاحة.':'Avatar unavailable. Voice calling is still available.'}</span>}
    <span className="echo-voice-avatar-label">{ar?'شخصية افتراضية · صوت مولّد بالذكاء الاصطناعي':'Virtual avatar · AI-generated voice'}</span>
  </div>;
}
