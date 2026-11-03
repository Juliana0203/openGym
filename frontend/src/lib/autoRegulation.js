// Load auto-regulation from a rated set: compare the RIR the plan asked for with the RIR the
// lifter reported and suggest a load for the next set. Pure helper; the UI decides what to do
// with the suggestion. Weights are snapped to the loadable step (snapWeight), never below 0.
import { snapWeight } from './progression.js'

// The plan carries no per-set RIR yet, so every working set is judged against this one.
export const DEFAULT_TARGET_RIR = 2
const DEFAULT_STEP = 2.5
const DROP_MIN = 0.05
const DROP_MAX = 0.10
const RAISE = 0.05

/**
 * @param {number} targetRIR  reps in reserve the plan asked for
 * @param {number} actualRIR  reps in reserve the lifter reported (null/undefined = not rated)
 * @param {number} weight     load of the set just done
 * @param {number} [step]     smallest loadable increment (smallest plate pair)
 * @returns {{ action: 'keep'|'decrease'|'increase', weight: number, pct: number, message: string|null }}
 */
export function autoRegulate(targetRIR, actualRIR, weight, step = DEFAULT_STEP) {
  const w = Number(weight)
  const keep = { action: 'keep', weight: w > 0 ? w : 0, pct: 0, message: null }
  if (actualRIR == null || targetRIR == null || !(w > 0)) return keep
  const target = Number(targetRIR), actual = Number(actualRIR)
  if (!Number.isFinite(target) || !Number.isFinite(actual)) return keep

  if (actual < target - 1) {
    // 5% for a miss of just over one rep, growing 2.5% per extra rep, capped at 10%.
    const deficit = target - actual
    const pct = Math.min(DROP_MAX, Math.max(DROP_MIN, DROP_MIN + (deficit - 2) * 0.025))
    let next = snapWeight(w * (1 - pct), step)
    if (next >= w) next = Math.max(0, snapWeight(w - step, step))
    return {
      action: 'decrease', weight: next, pct,
      message: `Harder than planned (RIR ${actual}, target ${target}). Drop to ${next}.`
    }
  }
  if (actual > target + 1) {
    let next = snapWeight(w * (1 + RAISE), step)
    if (next <= w) next = snapWeight(w + step, step)
    return {
      action: 'increase', weight: next, pct: RAISE,
      message: `Felt easy (RIR ${actual}, target ${target}). Try ${next}.`
    }
  }
  return keep
}
