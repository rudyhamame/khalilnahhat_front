export function equipmentLimit(item){return item.availabilityStatus==='unavailable'?0:Number.isSafeInteger(item.availableQuantity)&&item.availableQuantity>=0?item.availableQuantity:99;}
export function equipmentQuantity(item,value){const quantity=Math.max(0,Math.min(equipmentLimit(item),Math.floor(Number(value)||0)));return quantity>0?Math.min(equipmentLimit(item),Math.max(quantity,Number(item.minQuantity)||1)):0;}
export function equipmentKind(id=''){
 if(/soundcraft|mixer/.test(id))return 'mixer';if(/shure|mic/.test(id))return 'mic';if(/led-screen/.test(id))return 'screen';if(/projector/.test(id))return 'projector';if(/truss/.test(id))return 'truss';if(/movinghead/.test(id))return 'light';if(/uplight/.test(id))return 'uplight';if(/es18|sub/.test(id))return 'sub';if(/qsc|elite|jbl|speaker/.test(id))return 'speaker';return 'fx';
}
// Real-world metres (truss portal is 4 x 3 m), so every item reads at the right scale beside it and the guests.
export const MODEL_SIZES={mixer:[.65,.18,.5],mic:[.28,.2,.22],screen:[3,1.2,.2],projector:[.5,.25,.4],truss:[4,3,.7],light:[.25,.36,.25],uplight:[.2,.26,.2],sub:[.55,.65,.7],speaker:[.35,.56,.33],fx:[.45,.45,.55]};
export function layoutEquipment(items,width=10,depth=8){
 const counts={},units=[];let total=0,tableN=0;const tableEdge=[.71,.71];// free table width either side of the controller
 const qty=item=>Math.max(0,Math.floor(Number(item.quantity)||0)),hasTruss=items.some(item=>equipmentKind(item.id)==='truss'&&qty(item)),lightTotal=items.filter(item=>equipmentKind(item.id)==='light').reduce((sum,item)=>sum+qty(item),0),uplightTotal=items.filter(item=>equipmentKind(item.id)==='uplight').reduce((sum,item)=>sum+qty(item),0);
 for(const item of items){const quantity=Math.max(0,Math.floor(Number(item.quantity)||0));total+=quantity;for(let index=0;index<quantity&&units.length<60;index++){
 const kind=equipmentKind(item.id),n=counts[kind]||0;counts[kind]=n+1;let x=0,z=-depth/2+1.25,y=0,rot=0,hung=false;
 // Stage plan (back wall = -depth/2): truss + LED wall at the back, DJ table centre, tops and subs flanking the truss, effects at the front edge, uplights on the back wall.
 const side=n%2?1:-1,ring=Math.floor(n/2);
 if(kind==='speaker'){x=side*(3.2+ring*.9);z=-depth/2+1.3+ring*.3;y=1.2;}
 else if(kind==='sub'){x=side*(2.5+ring*.9);z=-depth/2+1.6+ring*.3;}
 else if(kind==='projector'){x=0;z=depth/2-1.6;y=2.55;hung=true;}// ceiling-mounted at the back of the room, throwing toward the screen
 else if(['mixer','mic'].includes(kind)){const sd=tableN%2?1:-1,w=MODEL_SIZES[kind][0]*1.2,at=sd>0?1:0;x=sd*(tableEdge[at]+w/2);tableEdge[at]+=w+.15;tableN++;z=-depth/2+1.8;y=.94;rot=Math.PI;}// turned 180° and spaced along the booth table// beside the DJ controller on the booth table
 else if(kind==='screen'){x=n?(n%2?1:-1)*Math.ceil(n/2)*3.2:0;z=hasTruss?-depth/2+.75:-depth/2+.3;y=hasTruss?1.25:1;}// first wall centred in the truss opening, same depth as the towers
 else if(kind==='truss'){x=0;z=-depth/2+.75+n*1.4;}
 else if(kind==='light'&&hasTruss){const slots=Math.min(lightTotal,8);x=slots<2?0:-1.3+(n%8)*2.6/(slots-1);z=-depth/2+.75;y=2.74;}// hung under the truss header
 else if(kind==='light'){x=(n%2?1:-1)*(width/2-.7);z=-depth/2+.8+Math.floor(n/2)*.7;y=kind==='light'?2.6:0;}
 else if(kind==='uplight'){const perSide=Math.max(1,Math.ceil(Math.min(uplightTotal,60)/2));x=side*(width/2-.45);z=-depth/2+.8+Math.floor(n/2)*(depth-1.6)/Math.max(1,perSide-1);}// along the side walls, washing them with colour
 else{x=side*(1.7+ring*.6);z=-depth/2+2.9+ring*.5;}
 // An admin-set placement (Equipment > 3D room) replaces the automatic stage plan; extra units of the same item stand in a row beside the first.
 const placed=item.roomPlacement;if(placed&&Number.isFinite(placed.x)){x=placed.x+index*((MODEL_SIZES[kind]?.[0]||.5)*(placed.scale>0?placed.scale:1)+.25);z=-depth/2+(placed.fromBack||0);y=placed.height>0?placed.height:y;rot=(placed.rotation||0)*Math.PI/180;hung=placed.height>=2;}
 units.push({...item,rot,hung:placed&&Number.isFinite(placed.x)?hung:(hung||(kind==='light'&&hasTruss)),key:`${item.id}:${index}`,kind,x:Math.max(-width/2+.35,Math.min(width/2-.35,x)),y,z:Math.max(-depth/2+.3,Math.min(depth/2-.3,z))});
 }}return {units,total,omitted:Math.max(0,total-units.length),table:units.some(unit=>['mixer','mic'].includes(unit.kind))};
}
export function layoutGuests(count,width,depth){
 const total=Math.max(0,Math.floor(Number(count)||0)),shown=Math.min(240,total),areaWidth=Math.max(1,width-1.4),areaDepth=Math.max(1,depth-4.2),columns=Math.max(1,Math.ceil(Math.sqrt(shown*areaWidth/areaDepth))),rows=Math.max(1,Math.ceil(shown/columns));
 return {total,shown,omitted:total-shown,people:Array.from({length:shown},(_,i)=>({x:-areaWidth/2+(i%columns+.5)*areaWidth/columns+Math.sin(i*17)*.06,z:-depth/2+3.5+(Math.floor(i/columns)+.5)*areaDepth/rows,rotation:Math.sin(i*7)*.6}))};
}
// The room is planned in three spaces, back wall first: the DJ stage, a dance floor in front of it, and the dining area with wooden four-top tables.
// Every guest has a seat at a four-top table; some of them are on the dance floor (their chairs stay empty). Guests with no table in the room are reported as omitted.
export function layoutRoomZones(count,width,depth){
 const total=Math.max(0,Math.floor(Number(count)||0)),stageEnd=-depth/2+3.7;
 const danceW=Math.min(Math.max(3,width-3),7.5),danceD=Math.max(2.4,Math.min(5,depth*.26)),danceZ=stageEnd+.2+danceD/2;
 const dance={x:0,z:danceZ,w:danceW,d:danceD};
 const tz0=danceZ+danceD/2+.9,tz1=depth/2-.8,tx0=-width/2+1.3,tx1=width/2-1.3;
 const cols=Math.max(0,Math.floor((tx1-tx0)/2.6)),rows=Math.max(0,Math.floor((tz1-tz0)/2.3)),slots=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)slots.push({x:tx0+(tx1-tx0)*(col+.5)/cols,z:tz0+(tz1-tz0)*(row+.5)/rows});
 const dancerCap=Math.max(0,Math.min(150,Math.floor((danceW-.8)*(danceD-.8)/.9)));
 // Every guest has a seat at a table; the guests who are dancing have simply left theirs, so their chairs stay empty.
 const tablesUsed=Math.min(slots.length,Math.ceil(total/4)),assigned=Math.min(total,tablesUsed*4);
 const dancersN=Math.min(Math.round(assigned*.3),dancerCap),seatedN=assigned-dancersN;
 const perTable=index=>Math.floor(seatedN/(tablesUsed||1))+(index<seatedN%(tablesUsed||1)?1:0);
 const tables=slots.slice(0,tablesUsed).map((slot,index)=>({...slot,index,guests:perTable(index),
  chairs:[[-.3,-.7,0],[.3,-.7,0],[-.3,.7,Math.PI],[.3,.7,Math.PI]].map(([dx,dz,rotation])=>({x:slot.x+dx,z:slot.z+dz,rotation}))}));
 const seated=tables.flatMap(table=>table.chairs.slice(0,table.guests).map(chair=>({x:chair.x,z:chair.z,rotation:chair.rotation})));
 const columns=Math.max(1,Math.ceil(Math.sqrt(dancersN*(danceW-.8)/(danceD-.8)))),dancerRows=Math.max(1,Math.ceil(dancersN/columns));
 const dancers=Array.from({length:dancersN},(_,i)=>({x:-(danceW-.8)/2+((i%columns)+.5)*(danceW-.8)/columns+Math.sin(i*13)*.12,z:danceZ-(danceD-.8)/2+(Math.floor(i/columns)+.5)*(danceD-.8)/dancerRows+Math.cos(i*7)*.1,rotation:Math.sin(i*5)*Math.PI}));
 return {total,shown:seated.length+dancers.length,omitted:total-seated.length-dancers.length,seatsAvailable:tablesUsed*4,stageEnd,dance,tables,seated,dancers,dining:{z0:tz0,z1:tz1}};
}
// The smallest room (in whole metres, a little wider than deep) that holds the stage, the dance floor and a seat for every guest. Never smaller than 14 x 12 m.
export function recommendedRoomSize(count){
 const total=Math.max(0,Math.floor(Number(count)||0));
 for(let depth=12;depth<=60;depth+=2){const width=Math.max(14,Math.round(depth*1.2/2)*2);if(layoutRoomZones(total,width,depth).omitted===0)return {width,depth};}
 return {width:72,depth:60};
}
