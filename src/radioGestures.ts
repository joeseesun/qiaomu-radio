export function clampVolume(value: number) { return Math.max(0, Math.min(1, value)); }
export function tuningSteps(dx: number, dy: number) { return Math.trunc((dx - dy) / 18); }
export function radioPartIndex(name: string) { return Number(name.match(/(\d+)$/)?.[1]); }

export const VOLUME_SWEEP = Math.PI * 1.5;
export const TUNING_DETENT = Math.PI / 10;
/** Shortest signed arc, continuous across the atan2 seam. Clockwise is positive. */
export function clockwiseArc(previous: number, next: number) {
  return Math.atan2(Math.sin(previous - next), Math.cos(previous - next));
}
export function turnVolume(value: number, radians: number) { return clampVolume(value + radians / VOLUME_SWEEP); }
export function volumeAngle(value: number) { return (.5 - clampVolume(value)) * VOLUME_SWEEP; }
export function detents(radians: number) { return Math.round(radians / TUNING_DETENT); }
