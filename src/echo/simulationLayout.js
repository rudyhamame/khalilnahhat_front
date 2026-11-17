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
// The room is planned in three spaces, back wall first: the DJ stage, a dance floor in front of it, and the dining area with oval tables that seat 5 to 8 guests each, like a luxury restaurant.
// Every guest has a seat at an oval table (5 to 8 seats, a different number per table, always the same for the same table); some of them are on the dance floor (their chairs stay empty). Guests with no table in the room are reported as omitted.
// plan (optional, set by the hosts): {columns, tables, seated}: how many columns and tables the room has, and how many guests sit at each numbered table.
// Visual planning allowance, not a venue capacity certification: reserve room
// for the booked guests on the carpet, with a clear edge around the dancers.
export function danceFloorSize(count,width,depth){
 const guests=Math.max(0,Math.floor(Number(count)||0)),area=guests*.9;
 const w=Math.min(Math.max(1,width-2.6),Math.max(3,Math.sqrt(area*1.4)+.8));
 const d=Math.min(Math.max(1,depth-8),Math.max(2.4,Math.sqrt(area/1.4)+.8));
 return {w,d,capacity:Math.floor(Math.max(0,w-.8)*Math.max(0,d-.8)/.9+1e-6)};
}
export function layoutRoomZones(count,width,depth,plan=null){
 const total=Math.max(0,Math.floor(Number(count)||0)),stageEnd=-depth/2+3.7;
 const {w:danceW,d:danceD,capacity:danceCapacity}=danceFloorSize(total,width,depth),danceZ=stageEnd+.2+danceD/2;
 const dance={x:0,z:danceZ,w:danceW,d:danceD,capacity:danceCapacity};
 const tz0=danceZ+danceD/2+.9,tz1=depth/2-.8,tx0=-width/2+1.3,tx1=width/2-1.3;
 // Columns are scattered, not gridded: a pseudo-random but fixed spread, kept apart from each other, only where the dining area is big enough.
 const unit=(index,salt)=>(Math.sin(index*12.9898+salt*78.233)*43758.5453%1+1)/2,pillars=[],pillarTarget=Number.isInteger(plan?.columns)?Math.max(0,plan.columns):Math.floor((tx1-tx0)*(tz1-tz0)/90);
 for(let i=0;i<pillarTarget*40&&pillars.length<pillarTarget;i++){const x=tx0+.8+unit(i,11)*(tx1-tx0-1.6),z=tz0+.8+unit(i,12)*(tz1-tz0-1.6);if(tx1-tx0>1.6&&tz1-tz0>1.6&&pillars.every(other=>Math.hypot(other.x-x,other.z-z)>=(i<pillarTarget*8?4.5:2.5)))pillars.push({x,z});}
 // Tables are not on a matrix: rows are staggered, every table is nudged and turned a little (always the same for the same room), and none sits on a column.
 const noise=(index,salt)=>Math.sin(index*12.9898+salt*78.233)*43758.5453%1,slots=[];
 // Tables (with their chairs) stand at least 3 guest widths (1.8 m) apart, so a guest can always walk between them.
 const cellX=5.9,cellZ=5.0,rowsN=tz1-tz0>=2.4?Math.floor((tz1-tz0-2.4)/cellZ)+1:0;
 for(let row=0;row<rowsN;row++){const shift=row%2?cellX/2:0,count=tx1-tx0-shift>=2.7?Math.floor((tx1-tx0-shift-2.7)/cellX)+1:0;const offset=(tx1-tx0-shift-count*cellX)/2;
  for(let col=0;col<count;col++){const n=row*100+col,x=tx0+offset+shift+(col+.5)*cellX+noise(n,1)*.4,z=tz0+(tz1-tz0-rowsN*cellZ)/2+(row+.5)*cellZ+noise(n,2)*.35;
   if(pillars.some(column=>Math.hypot(column.x-x,column.z-z)<2.3)||slots.some(other=>Math.hypot(other.x-x,other.z-z)<5.7)||(depth>=6&&Math.hypot(x+width/2,z-(depth/2-1.6))<3.2))continue; // clear of columns, of other tables and of the entrance door
   slots.push({x,z,rotation:noise(n,3)*.8});}}
 // A table seats exactly as many guests as sit at it (a round table holds up to 12), so there is no fixed or random seat count. Without a table count from the hosts, tables are added at about 8 guests each.
 const MAX_SEATS=12,TARGET_PER_TABLE=8;
 const tablesUsed=Number.isInteger(plan?.tables)?Math.min(Math.max(0,plan.tables),slots.length):Math.min(slots.length,Math.ceil(total/TARGET_PER_TABLE));
 // Everyone starts seated. A table the hosts gave a number to gets exactly that many guests; the rest of the guests are divided evenly among the tables with no number (then any table with a free chair).
 const given=Array.from({length:tablesUsed},(_,i)=>{const value=plan?.seated?.[i];return Number.isFinite(value)?Math.min(MAX_SEATS,Math.max(0,Math.floor(value))):null;});
 const dealt=given.map(value=>value??0);let left=Math.max(0,total-dealt.reduce((sum,value)=>sum+value,0));
 const deal=pool=>{for(let moved=true;left>0&&moved;){moved=false;for(const i of pool){if(left>0&&dealt[i]<MAX_SEATS){dealt[i]++;left--;moved=true;}}}};
 deal(given.map((value,i)=>value===null?i:-1).filter(i=>i>=0));deal(dealt.map((_,i)=>i));
 const perTable=index=>dealt[index],dancersN=0;
 // Tables are spread evenly: take a compact patch of the dining area (just big enough for them) and pick the tables one by one,
 // each as far as possible from those already chosen, so there are neither clusters nor big gaps.
 const pickEven=count=>{
  if(count<=0)return [];
  if(count>=slots.length)return slots;
  const cx=(tx0+tx1)/2,cz=(tz0+tz1)/2,sx=Math.max(1,tx1-tx0),sz=Math.max(1,tz1-tz0),distance=slot=>Math.hypot((slot.x-cx)/sx,(slot.z-cz)/sz);
  const pool=[...slots].sort((a,b)=>distance(a)-distance(b)).slice(0,Math.min(slots.length,Math.ceil(count*1.2)));
  const chosen=[pool.reduce((best,slot)=>Math.hypot(slot.x-cx,slot.z-cz)<Math.hypot(best.x-cx,best.z-cz)?slot:best)];
  while(chosen.length<count){let best=null,gap=-1;for(const slot of pool){if(chosen.includes(slot))continue;const nearest=Math.min(...chosen.map(other=>Math.hypot(other.x-slot.x,other.z-slot.z)));if(nearest>gap){gap=nearest;best=slot;}}chosen.push(best);}
  return chosen;
 };
 // Tables are numbered in reading order: the rows from the stage towards the door, each row left to right.
 const tables=pickEven(tablesUsed).sort((a,b)=>Math.round(a.z/3.2)-Math.round(b.z/3.2)||a.x-b.x).map((slot,index)=>{const seatCount=Math.max(2,perTable(index)),size=Math.max(.5,Math.min(1.15,seatCount*.115));/* the table grows with its guests */return {...slot,index,number:index+1,guests:perTable(index),size,
  chairs:Array.from({length:seatCount},(_,j)=>{const angle=2*Math.PI*j/seatCount,lx=1.35*size*Math.sin(angle),lz=.98*size*Math.cos(angle),c=Math.cos(slot.rotation),sn=Math.sin(slot.rotation),dx=lx*c+lz*sn,dz=-lx*sn+lz*c;return {x:slot.x+dx,z:slot.z+dz,rotation:Math.atan2(-dx,-dz)};})};});
 const seated=tables.flatMap(table=>table.chairs.slice(0,table.guests).map(chair=>({x:chair.x,z:chair.z,rotation:chair.rotation})));
 const columns=Math.max(1,Math.ceil(Math.sqrt(dancersN*(danceW-.8)/(danceD-.8)))),dancerRows=Math.max(1,Math.ceil(dancersN/columns));
 const dancers=Array.from({length:dancersN},(_,i)=>({x:-(danceW-.8)/2+((i%columns)+.5)*(danceW-.8)/columns+Math.sin(i*13)*.12,z:danceZ-(danceD-.8)/2+(Math.floor(i/columns)+.5)*(danceD-.8)/dancerRows+Math.cos(i*7)*.1,rotation:Math.sin(i*5)*Math.PI}));
 return {total,shown:seated.length+dancers.length,omitted:Math.max(0,total-seated.length),seatsAvailable:tablesUsed*MAX_SEATS,stageEnd,dance,tables,columns:pillars,seated,dancers,dining:{z0:tz0,z1:tz1}};
}
// The smallest room (in whole metres, a little wider than deep) that holds the stage, the dance floor and a seat for every guest. Never smaller than 14 x 12 m.
export function recommendedRoomSize(count){
 const total=Math.max(0,Math.floor(Number(count)||0));
 for(let depth=12;depth<=100;depth+=2){const width=Math.max(14,Math.round(depth*1.2/2)*2);const zones=layoutRoomZones(total,width,depth);if(zones.omitted===0&&zones.dance.capacity>=total)return {width,depth};}
 return {width:120,depth:100};
}

// Where the cake table and the sweetheart table first stand (the 3D room and the blueprint both use this, so they always agree).
export function placeExtras(zones,width,depth){
 const {dance}=zones;
 return {
  cake:{x:Math.min(width/2-1.1,dance.x+dance.w/2+1.4),z:Math.min(depth/2-1.2,-depth/2+3.7+1.5)},
  sweetheart:{x:Math.max(-width/2+1.6,Math.min(width/2-1.6,dance.x-dance.w/2-1.8)),z:-depth/2+2.4},
 };
}
