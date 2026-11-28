// The ONE list of booking atoms: the Data atoms tree of the admin dashboard (fixed atoms + every equipment item) as it applies to this order.
// The footer, Echo Smart Cart, Echo AI and the next-question logic all read it; nothing else decides what is required, optional or done.
import {bookingAtomApplies,bookingAtomRequired,bookingTreeAtomMounted} from './bookingAtoms.mjs';
import {getPath,isAnswered} from './eventOrderCore.mjs';
import {treeData,treeSteps} from './treeCore.js';
import {withRentalAtoms} from '../echo/docs/bookingAtomTree.js';

export const isEquipmentAtom=key=>key.startsWith('equipment:');
export function treeAtomProgress(order,data=treeData()){
 const mounted=treeSteps(),chosen=new Set((order?.equipment||[]).map(item=>item.id));
 return withRentalAtoms(data).flatMap(step=>step.sections.flatMap(section=>section.atoms.map(atom=>({...atom,step:Number(step.code)}))))
  .map(atom=>({...atom,equipment:isEquipmentAtom(atom.key),waiting:Boolean(atom.gate)&&getPath(order,atom.gate)==null}))
  .filter(atom=>atom.equipment||(bookingAtomApplies(order,atom.key)||atom.waiting)&&bookingTreeAtomMounted(atom.code,mounted))
  .map(atom=>({key:atom.key,code:atom.code,step:atom.step,equipment:atom.equipment,
   // A gated atom whose question is not answered yet (MC languages before the MC decision) already counts: the tree says it is required.
   required:!atom.equipment&&(atom.waiting?Boolean(atom.required):bookingAtomRequired(order,atom.key)),
   done:atom.equipment?chosen.has(atom.key.split(':').at(-1)):isAnswered(getPath(order,atom.key))}));
}
