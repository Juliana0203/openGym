// Guided blocks around a session: a 3 to 5 minute joint-mobility warm-up before the first set, and
// a short stretch for the muscles that were worked after the last one. Pure data and picking;
// the names and cues are written in components/PrepBlock.jsx (copy lives in t() calls there).
import { EXIDX } from './exercises.js'
import { isWarmupRow } from './workout-model.js'
import { muscleOfExercise } from './musclePrefs.js'

const LOWER_PARTS = new Set(['upper legs', 'lower legs'])

// [move id, seconds]. Dynamic and joint-led: nothing held, nothing loaded.
const WARMUPS = {
  upper: [['march', 45], ['arm-circles', 30], ['shoulder-rolls', 30], ['cat-cow', 40], ['thoracic-rotation', 40], ['scap-pushup', 30]],
  lower: [['march', 45], ['hip-circles', 40], ['leg-swings', 40], ['bodyweight-squat', 45], ['lunge-rotation', 45], ['glute-bridge', 30]],
  full: [['march', 45], ['arm-circles', 30], ['cat-cow', 40], ['hip-circles', 40], ['bodyweight-squat', 45], ['worlds-greatest', 45]]
}

// Static stretches by muscle slug (lib/muscles.js), held 30 seconds, each side where it has one.
const STRETCHES = {
  chest: 'doorway-chest', 'upper-back': 'lat-stretch', deltoids: 'cross-body-shoulder', biceps: 'wall-biceps',
  triceps: 'overhead-triceps', abs: 'cobra', 'lower-back': 'knees-to-chest', gluteal: 'figure-four',
  quadriceps: 'standing-quad', hamstring: 'seated-hamstring', calves: 'wall-calf'
}
export const STRETCH_SECONDS = 30
export const MAX_STRETCHES = 6

const total = moves => moves.reduce((sum, [, sec]) => sum + sec, 0)

/** Which half of the body the session loads: 'upper', 'lower' or 'full'. */
export function sessionFocus(entries = []) {
  let lower = 0, upper = 0
  for (const e of entries) {
    const bp = EXIDX[e?.id]?.bp
    if (!bp || bp === 'cardio' || bp === 'waist') continue
    if (LOWER_PARTS.has(bp)) lower++; else upper++
  }
  const n = lower + upper
  if (!n) return 'full'
  return lower / n >= 0.7 ? 'lower' : lower / n <= 0.3 ? 'upper' : 'full'
}

/** The warm-up for a session: { focus, moves: [{ id, sec }], sec }. Always between 3 and 5 minutes. */
export function warmupFor(entries) {
  const focus = sessionFocus(entries)
  const list = WARMUPS[focus]
  return { focus, moves: list.map(([id, sec]) => ({ id, sec })), sec: total(list) }
}

/**
 * The cool-down for what was worked: the muscles with the most work sets first, one stretch each,
 * at most MAX_STRETCHES. Entries with no completed work set count nothing, so skipped exercises
 * are not stretched; with nothing done yet it falls back to what the plan holds.
 */
export function cooldownFor(entries = []) {
  const count = (e, onlyDone) => (e.sets || []).filter(s => !isWarmupRow(s) && (!onlyDone || s.done)).length
  const tally = onlyDone => {
    const by = new Map()
    for (const e of entries) {
      const muscle = muscleOfExercise(e?.id)
      const n = count(e, onlyDone)
      if (muscle && STRETCHES[muscle] && n > 0) by.set(muscle, (by.get(muscle) || 0) + n)
    }
    return by
  }
  const by = tally(true).size ? tally(true) : tally(false)
  const moves = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_STRETCHES)
    .map(([muscle]) => ({ id: STRETCHES[muscle], sec: STRETCH_SECONDS, muscle }))
  return { moves, sec: total(moves.map(m => [m.id, m.sec])) }
}

export const WARMUP_MOVE_IDS = [...new Set(Object.values(WARMUPS).flat().map(([id]) => id))]
export const STRETCH_IDS = Object.values(STRETCHES)
