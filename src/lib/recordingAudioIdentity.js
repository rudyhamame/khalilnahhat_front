// The storage key contains the byte fingerprint on both storage providers.
export function recordingAudioIdentity(value){
 let path;try{path=new URL(String(value),'https://local.invalid').pathname;}catch{return {hash:'',storageId:'',provider:'',version:''};}
 const ovh=/^\/khalil-media\/(public|private)\/([a-f0-9]{64})\.([a-z0-9]{1,12})$/i.exec(path);
 if(ovh)return {hash:ovh[2].toLowerCase(),storageId:path.slice(1),provider:'OVH',version:''};
 const legacy=/\/(khalil\/assets\/[^/]+\/([a-f0-9]{64}))\.[a-z0-9]+$/i.exec(path);
 return legacy?{hash:legacy[2].toLowerCase(),storageId:legacy[1],provider:'Cloudinary',version:/\/v(\d+)\//.exec(path)?.[1]||''}:{hash:'',storageId:'',provider:'',version:''};
}
