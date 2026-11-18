export function recordingStage(editor){
 if(!editor?.id)return 'DRAFT';
 return editor.value.status||'DRAFT';
}
// Publishing is explicit. Saving never changes the stage of a recording that already exists (a published one stays published, e.g. when pressing Back); a new recording starts as a Draft.
export function recordingSaveState(publish=false,current=''){
 return {status:publish?'PUBLISHED':current||'DRAFT'};
}
