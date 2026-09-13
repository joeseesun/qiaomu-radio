export type SpeakerMotion = { level: number; phase: number };
export function stepSpeakerMotion(state: SpeakerMotion, delta: number, audible: boolean, volume: number, reduced = false) {
  const dt = Math.min(.05, Math.max(0, delta));
  const target = audible && !reduced ? Math.sqrt(Math.min(1, Math.max(0, volume))) : 0;
  const level = reduced ? 0 : state.level + (target-state.level)*(1-Math.exp(-dt*(target>state.level?12:20)));
  const phase = (state.phase + dt*Math.PI*2*3.2) % (Math.PI*2);
  return { level: level < .0001 ? 0 : level, phase };
}

/** Playback ambience, deliberately not advertised as measured audio spectrum. */
export function speakerExcursion(state: SpeakerMotion, index: number) {
  return state.level===0?0:state.level*.012*Math.sin(state.phase+index*.32);
}

/** Visible companion for baked-texture GLBs, where depth-only vertex motion is otherwise imperceptible. */
export function speakerVisual(state: SpeakerMotion, index: number) {
  const excursion=speakerExcursion(state,index);
  return {
    excursion,
    scale:1+excursion*7,
    opacity:state.level*Math.max(.08,.20+excursion*2.5),
  };
}
