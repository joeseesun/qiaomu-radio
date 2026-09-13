export type PressMotion = {
  depth: number;
  velocity: number;
  pulse: number;
};

export const MAX_PRESS_DEPTH = 0.024;

export function stepPressMotion(
  motion: PressMotion,
  pressed: boolean,
  deltaSeconds: number,
  reducedMotion = false,
): PressMotion {
  const target = pressed ? MAX_PRESS_DEPTH : 0;
  if (reducedMotion) {
    return { depth: target, velocity: 0, pulse: 0 };
  }

  const delta = Math.min(Math.max(deltaSeconds, 0), 0.05);
  // Exact critically damped spring: identical travel at 30, 60 and 120 Hz.
  const frequency = pressed ? 48 : 30;
  const offset = motion.depth - target;
  const impulse = motion.velocity + frequency * offset;
  const decay = Math.exp(-frequency * delta);
  const depth = target + (offset + impulse * delta) * decay;
  const velocity = (motion.velocity - frequency * impulse * delta) * decay;
  return { depth, velocity, pulse: Math.max(0, motion.pulse - delta * 3.8) };
}

export function pulsePressMotion(motion: PressMotion): PressMotion {
  // Even a tap shorter than one render frame gets a visible mechanical stroke.
  return { depth: Math.max(motion.depth, MAX_PRESS_DEPTH * .9), velocity: 0, pulse: 1 };
}
