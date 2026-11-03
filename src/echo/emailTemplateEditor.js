export const emailDetailLabel=key=>({recipientName:'Recipient name',customerName:'Customer name',customerEmail:'Customer email',requestId:'Request number',actionUrl:'Action link',brand:'Brand name',details:'Request details',liveTitle:'Broadcast title',liveGoal:'Broadcast goal',total:'Quote total',adminNote:'Team note',expiresAt:'Expiry date',eventDate:'Event date',venue:'Venue',depositAmount:'Deposit amount',meetingTime:'Meeting time',duration:'Duration',meetingLocation:'Meeting location',topic:'Meeting topic'}[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,value=>value.toUpperCase()));
export function templateSegments(value){
 const result=[];let end=0;
 for(const match of value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)){if(match.index>end)result.push({text:value.slice(end,match.index)});result.push({variable:match[1]});end=match.index+match[0].length;}
 if(end<value.length)result.push({text:value.slice(end)});return result;
}
export function missingEmailDetails(body,required){const present=new Set(templateSegments(body).map(part=>part.variable).filter(Boolean));return required.filter(key=>!present.has(key));}
// Read plain text and our own non-editable detail chips. No formatting HTML is
// stored or sent; the existing API remains the final template validator.
export function readEmailEditor(root){
 let text='';const children=Array.from(root.childNodes);
 children.forEach((node,index)=>{
  if(node.nodeType===3){text+=node.textContent;return;}
  if(node.nodeType!==1)return;
  if(node.dataset.emailDetail){text+=`{{${node.dataset.emailDetail}}}`;return;}
  if(node.tagName==='BR'){if(children.length!==1)text+='\n';return;}
  const block=['DIV','P'].includes(node.tagName);
  if(block&&index>0&&!text.endsWith('\n'))text+='\n';
  text+=readEmailEditor(node);
  if(block&&index<children.length-1)text+='\n';
 });return text;
}
