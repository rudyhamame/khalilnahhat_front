export function recordingStage(editor){
 if(!editor?.id)return 'DRAFT';
 return editor.value.status||'DRAFT';
}
export function recordingSaveState(publish=false){
 return {status:publish?'PUBLISHED':'DRAFT'};
}
