import {Box3,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

export async function createEquipmentSetModel(parts){
  const loader=new GLTFLoader();
  const results=await Promise.allSettled(parts.map(part=>loader.loadAsync(part.src)));
  const roots=results.filter(result=>result.status==='fulfilled').map(result=>result.value.scene);
  try{
    // A partial set is misleading; do not quietly substitute its first piece.
    if(results.some(result=>result.status==='rejected'))throw new Error('Equipment set is incomplete');
    const set=new Group();
    roots.forEach((root,index)=>{
      const part=parts[index],bounds=new Box3().setFromObject(root),center=bounds.getCenter(new Vector3());
      root.position.sub(new Vector3(center.x,bounds.min.y,center.z));
      const placement=new Group();placement.name=part.key;
      placement.position.set(part.at?.[0]||0,part.height||0,part.at?.[1]||0);
      placement.rotation.y=part.at?.[2]||0;
      placement.add(root);set.add(placement);
    });
    const data=await new GLTFExporter().parseAsync(set,{binary:true});
    return new Blob([data],{type:'model/gltf-binary'});
  }finally{
    const resources=new Set();
    roots.forEach(root=>root.traverse(child=>{
      if(child.geometry)resources.add(child.geometry);
      for(const material of Array.isArray(child.material)?child.material:[child.material])if(material){
        resources.add(material);
        Object.values(material).forEach(value=>{if(value?.isTexture)resources.add(value);});
      }
    }));
    resources.forEach(resource=>resource.dispose());
  }
}
