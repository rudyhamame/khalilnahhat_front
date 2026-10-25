export function recordTurnDelta(previous, next) {
  return Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
}
export function recordSeekTime(start, radians, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(duration, start + radians / (2 * Math.PI) * 30));
}
