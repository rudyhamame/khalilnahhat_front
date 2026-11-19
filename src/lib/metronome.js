// Pendulum maths for the 3D metronome. The arm is at its far left or right on every beat, so it ticks with the music:
// beat 0 = far one side, beat 1 = far the other side, and so on. `start` is where the atom (and its beat grid) begins.
export function metronomeAngle(time,start,bpm,maxAngle=.5){
 if(!Number.isFinite(time)||!Number.isFinite(bpm)||bpm<=0)return 0;
 return Math.cos(Math.PI*(time-start)*bpm/60)*maxAngle;
}
// How close the arm is to an extreme (1 at a tick, falling off fast): drives the little flash on the weight.
export function metronomeTick(time,start,bpm){
 if(!Number.isFinite(time)||!Number.isFinite(bpm)||bpm<=0)return 0;
 return Math.abs(Math.cos(Math.PI*(time-start)*bpm/60))**40;
}
// Slow tempo = weight high on the arm, fast = low, like the real thing (40–208 BPM).
export const weightHeight=(bpm,low=.75,high=2.15)=>{const t=Math.min(1,Math.max(0,(208-(Number.isFinite(bpm)?bpm:120))/(208-40)));return low+(high-low)*t;};
