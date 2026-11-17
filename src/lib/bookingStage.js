import {bookingNextStep} from './bookingNextStep.js';
import {bookingGoal,goalProgress} from './bookingGoals.js';

// The one explicit booking stage: "required" (details still missing), "optional" (required done, the optional extras are being asked),
// "ready" (everything asked: the booking is announced as ready to submit).
export const optionalExtrasAnswered=order=>['references','notes'].some(id=>goalProgress(order,bookingGoal(id)).answered>0);
export function bookingStage(order,{optionalReviewed=false,ar=false}={}){
 const step=bookingNextStep(order||{},ar,{optionalDone:optionalReviewed||optionalExtrasAnswered(order||{})});
 return step.path?'required':step.ready?'ready':'optional';
}
// A plain "no / nothing more / that's all" in answer to the optional extras.
export const declinesOptionalExtras=text=>/^\s*(?:no|nope|nothing(?: more| else)?|that(?:’|')?s all|that is all|all good|no thanks?|nothing to add|لا|لا شيء|هذا كل شيء|لا شيء آخر)[\s.!،]*$/iu.test(String(text||''));
