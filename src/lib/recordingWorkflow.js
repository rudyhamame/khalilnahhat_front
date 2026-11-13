export function recordingStage(editor){
 if(!editor?.id)return 'DRAFT';
 return editor.value.publicationStatus==='PUBLISHED'&&editor.value.archivalStatus==='ACTIVE'?'PUBLISHED':'ARCHIVED';
}
export function recordingSaveState(publish=false){
 return publish?{publicationStatus:'PUBLISHED',archivalStatus:'ACTIVE'}:{publicationStatus:'DRAFT',archivalStatus:'ARCHIVED'};
}
