// Smart routine suggestion: from a profile to a week of the starter routines, re-cut for the
// person. Pure and framework-free; the sheet in sheets.jsx only collects the profile and calls
// buildRecommendedPlan.
//
// The rules, in the order they are applied:
//  - Days a week fix the split: 2 full body, 3 push/pull/legs, 4 upper/lower, 5 push/pull/legs plus
//    upper/lower (the extra sessions are where the volume specialises).
//  - Goal sets the rep range, the rest and the RIR. Lose weight and maintain share the balanced
//    8-15 reps; bulking is 6-12 close to failure; strength is 3-6 heavy with 1 RIR.
//  - Experience sets the volume. A beginner stays near the minimum effective volume (MEV: at most
//    3 sets on a lift, 2 on an accessory, an extra RIR in the tank). An advanced lifter works in
//    the adaptive range (MAV): one more set on the first two heavy lifts of a session.
//  - Body type trims or tolerates density. Slim and hard to gain loses the metabolic sets (high
//    rep accessories lose a set, reps stop at 12) and rests longer; easy to gain rests a little less.
//  - Injuries swap the exercises that load the sore area for guided variants, or drop them.
//
// Gender never picks a different programme. It only nudges which half of the body gets the
// extra set (and goes first in a four-day split), and `emphasis` can override it outright.
import { buildPlanFromKeys } from './starter.js'
import { EXIDX } from './exercises.js'
import { GENDERS } from './gender.js'

export const GOALS = ['hypertrophy', 'strength', 'recomposition']
export const EXPERIENCES = ['beginner', 'intermediate', 'advanced']
export const BODY_TYPES = ['slim_hard_to_gain', 'easy_to_gain', 'athletic_balanced']
export const MIN_DAYS = 2
export const MAX_DAYS = 5
const LEG_PARTS = new Set(['upper legs', 'lower legs'])

// The goals the onboarding asks, read as the ones the programming is written for.
const GOAL_ALIASES = { lose_weight: 'recomposition', maintain: 'recomposition', bulking: 'hypertrophy' }

// [weekday, routineKey] per day count, as getDay() indexes (1 is Monday), rest days in between.
const SPLITS = {
  2: { split: 'full-body', days: [[1, 'fb-a'], [4, 'fb-b']] },
  3: { split: 'ppl', days: [[1, 'push'], [3, 'pull'], [5, 'legs']] },
  4: { split: 'upper-lower', days: [[1, 'upper-a'], [2, 'lower-a'], [4, 'upper-b'], [5, 'lower-b']] },
  5: { split: 'ppl-upper-lower', days: [[1, 'push'], [2, 'pull'], [3, 'legs'], [5, 'upper-a'], [6, 'lower-a']] }
}

// Exercises that load a sore area, and what stands in for them: an id is a guided or supported
// variant, null drops the exercise. Keyed by the injury areas of lib/profile.js; the areas with no
// entry (neck, hip, ankle) change nothing.
const SAFE_SWAPS = {
  lower_back: { '0043': '0739', '0085': '0586', '0027': '1350', '0426': '0405' }, // squat, RDL, bent-over row, standing press
  knee: { '0043': '0739', '0585': null }, // squat to leg press, no open-chain leg extension
  shoulder: { '0251': null, '0426': null, '0405': null }, // dips and overhead pressing
  elbow: { '0031': '0313', '0251': null }, // barbell curl to hammer curl
  wrist: { '0031': '0313', '0251': null }
}

/** What to train instead of exercise `id` for these injuries: an id, null (drop it) or undefined (keep it). */
export function safeVariant(id, injuries = []) {
  let cur = id
  for (let hop = 0; hop < 3; hop++) {
    const rules = injuries.map(a => SAFE_SWAPS[a]).find(r => r && cur in r)
    if (!rules) break
    cur = rules[cur]
    if (cur === null) return null
  }
  return cur === id ? undefined : cur
}

export const normalizeProfile = (profile = {}) => {
  const days = Math.round(Number(profile.daysAvailable))
  const goal = GOAL_ALIASES[profile.goal] || profile.goal
  return {
    gender: GENDERS.includes(profile.gender) ? profile.gender : null,
    daysAvailable: Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)) : 3,
    goal: GOALS.includes(goal) ? goal : 'hypertrophy',
    experience: EXPERIENCES.includes(profile.experience) ? profile.experience : null,
    bodyType: BODY_TYPES.includes(profile.bodyType) ? profile.bodyType : null,
    injuries: [...new Set([].concat(profile.injuries || []).filter(a => a in SAFE_SWAPS))]
  }
}

// 'lower' | 'upper' | 'balanced'. Strength work stays even whatever the profile says.
export const emphasisFor = ({ gender, goal }, override) => {
  if (['lower', 'upper', 'balanced'].includes(override)) return override
  if (goal === 'strength') return 'balanced'
  return gender === 'female' ? 'lower' : gender === 'male' ? 'upper' : 'balanced'
}

const swapPairs = days => days.map(([day, key], i) => [day, days[i ^ 1]?.[1] ?? key])

function layoutFor(p, emphasis) {
  const base = SPLITS[p.daysAvailable]
  // Lower emphasis trains the legs first in the week, when fresh: lower-a, upper-a, lower-b, upper-b.
  return p.daysAvailable === 4 && emphasis === 'lower' ? { ...base, days: swapPairs(base.days) } : base
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// RIR the work is taken to. 2 is the app default, so it is left unset.
const rirFor = (goal, experience) => {
  const base = goal === 'recomposition' ? 2 : 1
  return experience === 'beginner' ? base + 1 : base
}

// Rest in seconds: long for heavy lifts, short for accessories; density shifts it for the body type.
const restFor = (goal, compound, bodyType) => {
  const base = goal === 'strength' ? (compound ? 180 : 120) : goal === 'hypertrophy' ? (compound ? 120 : 75) : (compound ? 90 : 60)
  return bodyType === 'slim_hard_to_gain' ? base + 30 : bodyType === 'easy_to_gain' ? Math.max(45, base - 15) : base
}

// Goal first (reps, sets, rest, RIR), then body type, then experience (volume), then at most one
// extra set per session on the emphasised half (two in a five-day week, where volume specialises).
function volumeAdjuster({ goal, experience, bodyType, daysAvailable }, emphasis) {
  const bumped = new Map(), heavy = new Map()
  const maxBumps = daysAvailable === 5 ? 2 : 1
  return (key, id, sets, reps) => {
    const compound = reps <= 10
    let s = sets, r = reps
    if (goal === 'strength') {
      r = compound ? 5 : 6
      s = compound ? clamp(sets, 4, 5) : Math.min(sets, 3)
    } else if (goal === 'hypertrophy') r = clamp(reps, 6, 12)
    else r = clamp(reps >= 10 ? reps + 2 : reps, 8, 15)

    if (bodyType === 'slim_hard_to_gain') {
      if (goal !== 'strength') r = Math.min(r, 12)
      if (reps >= 12 && s >= 3) s -= 1
    }

    if (experience === 'beginner') s = Math.min(s, compound ? 3 : 2)
    else if (experience === 'advanced' && compound && s >= 3 && (heavy.get(key) || 0) < 2) { s = Math.min(5, s + 1); heavy.set(key, (heavy.get(key) || 0) + 1) }

    const legs = LEG_PARTS.has(EXIDX[id]?.bp)
    const favoured = emphasis === 'lower' ? legs : emphasis === 'upper' ? !legs : false
    const growth = goal !== 'strength' && experience !== 'beginner' && bodyType !== 'slim_hard_to_gain'
    if (growth && favoured && s <= 3 && (bumped.get(key) || 0) < maxBumps) { s += 1; bumped.set(key, (bumped.get(key) || 0) + 1) }

    const rir = rirFor(goal, experience)
    return [s, r, { restSec: restFor(goal, compound, bodyType), ...(rir !== 2 && { targetRir: rir }) }]
  }
}

/**
 * The suggestion for a profile: { gender, daysAvailable, goal, experience, bodyType, injuries,
 * emphasis, split, schedule, adjust, swap }. `schedule` is [[weekday, routineKey], …] with exactly
 * daysAvailable entries (2 to 5). Inputs out of range or unknown fall back to 3 days, hypertrophy,
 * the usual volume and no restrictions.
 */
export function recommendRoutines(profile, { emphasis: override } = {}) {
  const p = normalizeProfile(profile)
  const emphasis = emphasisFor(p, override)
  const { split, days } = layoutFor(p, emphasis)
  const swap = p.injuries.length ? (_key, id) => safeVariant(id, p.injuries) : undefined
  return { ...p, emphasis, split, schedule: days.map(d => [...d]), adjust: volumeAdjuster(p, emphasis), swap }
}

/** The suggestion plus fresh routines and weekdays, ready for the same save path as a starter plan. */
export function buildRecommendedPlan(profile, { equipment, emphasis } = {}) {
  const rec = recommendRoutines(profile, { emphasis })
  const plan = buildPlanFromKeys(rec.schedule, { equipment, adjust: rec.adjust, swap: rec.swap })
  return plan && { ...rec, plan }
}

/** Working sets a week per target muscle of a built plan ({ quads: 9, … }), counting each session on the schedule. */
export function weeklySetsByMuscle(plan) {
  const out = {}
  for (const { routineId } of plan.schedule) {
    const routine = plan.routines.find(r => r.id === routineId)
    for (const e of routine?.ex || []) {
      const muscle = EXIDX[e.id]?.tg || 'other'
      out[muscle] = (out[muscle] || 0) + e.sets
    }
  }
  return out
}
