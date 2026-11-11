// Auto leveling: while the voice microphone speaks, the rest of the audio input is lowered so the voice stays clear, then it comes
// back after a short pause. Pure steps, so the behaviour is testable without audio hardware.
export const DUCK_DEFAULTS={threshold:.06,depth:.3,holdMs:900};
/**
 * state {factor, speakingUntil}; peak is the voice level 0..1; now in ms.
 * Speaking starts the duck at once and keeps it for holdMs after the last loud moment; the returned factor is the target
 * (1 = untouched, depth = ducked). The mixer smooths the move, so this only decides the target.
 */
export function duckStep(state,peak,now,{threshold,depth,holdMs}=DUCK_DEFAULTS){
  const speakingUntil=peak>=threshold?now+holdMs:state.speakingUntil;
  const target=now<speakingUntil?depth:1;
  return {factor:target,speakingUntil,changed:target!==state.factor};
}
