// Work types → their collections → recordings, in one movable window. Recordings of a work type that are in no collection are listed under "Not in a collection".
export function libraryTree(workTypes,collections,recordings){
 const byId=new Map(recordings.map(row=>[row.id,row])),known=new Set(workTypes.map(type=>type.id));
 const groups=workTypes.map(type=>{
  const own=recordings.filter(row=>(row.workType)===type.id),listed=new Set();
  const cols=collections.filter(col=>col.workTypeId===type.id).map(col=>{const rows=(col.recordingIds||[]).map(id=>byId.get(id)).filter(Boolean);rows.forEach(row=>listed.add(row.id));return {id:col.id,title:col.title||col.name||'Collection',recordings:rows};});
  return {id:type.id,name:type.name,collections:cols,loose:own.filter(row=>!listed.has(row.id)),count:own.length};
 });
 const other=recordings.filter(row=>!known.has(row.workType));
 return other.length?[...groups,{id:'',name:'Other recordings',collections:[],loose:other,count:other.length}]:groups;
}
