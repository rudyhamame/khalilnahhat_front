export function equipmentLimit(item){return item.availabilityStatus==='unavailable'?0:Number.isSafeInteger(item.availableQuantity)&&item.availableQuantity>=0?item.availableQuantity:99;}
export function equipmentQuantity(item,value){const quantity=Math.max(0,Math.min(equipmentLimit(item),Math.floor(Number(value)||0)));return quantity>0?Math.min(equipmentLimit(item),Math.max(quantity,Number(item.minQuantity)||1)):0;}
export function equipmentKind(id=''){
 if(/soundcraft|mixer/.test(id))return 'mixer';if(/shure|mic/.test(id))return 'mic';if(/led-screen/.test(id))return 'screen';if(/projector/.test(id))return 'projector';if(/truss/.test(id))return 'truss';if(/movinghead/.test(id))return 'light';if(/uplight/.test(id))return 'uplight';if(/es18|sub/.test(id))return 'sub';if(/qsc|elite|jbl|speaker/.test(id))return 'speaker';return 'fx';
}
// Real-world metres (truss portal is 4 x 3 m), so every item reads at the right scale beside it and the guests.
export const MODEL_SIZES={mixer:[.65,.18,.5],mic:[.28,.2,.22],screen:[3,1.2,.2],projector:[.5,.25,.4],truss:[4,3,.7],light:[.25,.36,.25],uplight:[.2,.26,.2],sub:[.55,.65,.7],speaker:[.35,.56,.33],fx:[.45,.45,.55]};
export function layoutEquipment(items,width=10,depth=8){
 const counts={},units=[];let total=0,tableN=0;const tableEdge=[.71,.71];// free table width either side of the controller
 const qty=item=>Math.max(0,Math.floor(Number(item.quantity)||0)),hasTruss=items.some(item=>equipmentKind(item.id)==='truss'&&qty(item)),lightTotal=items.filter(item=>equipmentKind(item.id)==='light').reduce((sum,item)=>sum+qty(item),0);
 for(const item of items){const quantity=Math.max(0,Math.floor(Number(item.quantity)||0));total+=quantity;for(let index=0;index<quantity&&units.length<60;index++){
 const kind=equipmentKind(item.id),n=counts[kind]||0;counts[kind]=n+1;let x=0,z=-depth/2+1.25,y=0,rot=0;
 // Stage plan (back wall = -depth/2): truss + LED wall at the back, DJ table centre, tops and subs flanking the truss, effects at the front edge, uplights on the back wall.
 const side=n%2?1:-1,ring=Math.floor(n/2);
 if(kind==='speaker'){x=side*(3.2+ring*.9);z=-depth/2+1.3+ring*.3;y=1.2;}
 else if(kind==='sub'){x=side*(2.5+ring*.9);z=-depth/2+1.6+ring*.3;}
 else if(['mixer','mic','projector'].includes(kind)){const sd=tableN%2?1:-1,w=MODEL_SIZES[kind][0]*1.2,at=sd>0?1:0;x=sd*(tableEdge[at]+w/2);tableEdge[at]+=w+.15;tableN++;z=-depth/2+1.8;y=.94;rot=Math.PI;}// turned 180° and spaced along the booth table// beside the DJ controller on the booth table
 else if(kind==='screen'){x=n?(n%2?1:-1)*Math.ceil(n/2)*3.2:0;z=hasTruss?-depth/2+.75:-depth/2+.3;y=hasTruss?1.25:1;}// first wall centred in the truss opening, same depth as the towers
 else if(kind==='truss'){x=0;z=-depth/2+.75+n*1.4;}
 else if(kind==='light'&&hasTruss){const slots=Math.min(lightTotal,8);x=slots<2?0:-1.3+(n%8)*2.6/(slots-1);z=-depth/2+.75;y=2.74;}// hung under the truss header
 else if(kind==='light'){x=(n%2?1:-1)*(width/2-.7);z=-depth/2+.8+Math.floor(n/2)*.7;y=kind==='light'?2.6:0;}
 else if(kind==='uplight'){x=-width/2+.5+(n%8)*(width-1)/7;z=-depth/2+.3+Math.floor(n/8)*.4;}
 else{x=side*(1.7+ring*.6);z=-depth/2+2.9+ring*.5;}
 units.push({...item,rot,hung:kind==='light'&&hasTruss,key:`${item.id}:${index}`,kind,x:Math.max(-width/2+.35,Math.min(width/2-.35,x)),y,z:Math.max(-depth/2+.3,Math.min(depth/2-.3,z))});
 }}return {units,total,omitted:Math.max(0,total-units.length),table:units.some(unit=>['mixer','mic','projector'].includes(unit.kind))};
}
export function layoutGuests(count,width,depth){
 const total=Math.max(0,Math.floor(Number(count)||0)),shown=Math.min(240,total),areaWidth=Math.max(1,width-1.4),areaDepth=Math.max(1,depth-4.2),columns=Math.max(1,Math.ceil(Math.sqrt(shown*areaWidth/areaDepth))),rows=Math.max(1,Math.ceil(shown/columns));
 return {total,shown,omitted:total-shown,people:Array.from({length:shown},(_,i)=>({x:-areaWidth/2+(i%columns+.5)*areaWidth/columns+Math.sin(i*17)*.06,z:-depth/2+3.5+(Math.floor(i/columns)+.5)*areaDepth/rows,rotation:Math.sin(i*7)*.6}))};
}
