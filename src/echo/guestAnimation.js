// The room controller owns horizontal travel. Mixamo's walk clip also moves the
// hips forward, which otherwise creates a repeated surge at every animation loop.
export function makeGuestClipInPlace(clip) {
 if(clip.name!=='walk')return clip;
 for(const track of clip.tracks){
  if(!track.name.endsWith('Hips.position'))continue;
  const values=track.values,count=values.length/3;if(count<2)continue;
  const first=[values[0],values[1],values[2]];
  const last=[values[3*(count-1)],values[3*(count-1)+1],values[3*(count-1)+2]];
  const drift=last.map((value,axis)=>value-first[axis]),magnitudes=drift.map(Math.abs);
  const forward=magnitudes.indexOf(Math.max(...magnitudes));
  // Forward travel is removed exactly. The other axes retain the natural hip
  // sway, with only their endpoint drift removed so the loop closes cleanly.
  for(let frame=0;frame<count;frame++)for(let axis=0;axis<3;axis++){
   values[3*frame+axis]=axis===forward?first[axis]:values[3*frame+axis]-drift[axis]*frame/(count-1);
  }
 }
 return clip;
}

export function guestSkeletonPrefix(root) {
 let prefix='mixamorig';
 root.traverse(child=>{
  const match=/^(mixamorig\d*):?Hips$/.exec(child.name||'');
  if(match)prefix=match[1];
 });
 return prefix;
}

export function retargetGuestClip(THREE,clip,prefix) {
 if(prefix==='mixamorig')return clip;
 return new THREE.AnimationClip(clip.name,clip.duration,clip.tracks.map(track=>{
  const renamed=track.clone();renamed.name=track.name.replace(/^mixamorig/,prefix);return renamed;
 }));
}
