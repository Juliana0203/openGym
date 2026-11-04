// Smart routine suggestion: from a profile (gender, days a week, goal) to a week of the starter
// routines with the volume re-cut a little for the goal. Pure and framework-free; the sheet in
// sheets.jsx only asks for the days and the goal, then calls buildRecommendedPlan.
//
// Gender never picks a different programme. It only nudges which half of the body gets the
// extra set (and goes first in a four-day split), and `emphasis` can override it outright.
import { buildPlanFromKeys } from './starter.js'
import { EXIDX } from './exercises.js'
import { GENDERS } from './gender.js'

export const GOALS = ['hypertrophy', 'strength', 'recomposition']
export const MIN_DAYS = 2
export const MAX_DAYS = 5
const LEG_PARTS = new Set(['upper legs', 'lower legs'])

// [weekday, routineKey] per day count, as getDay() indexes (1 is Monday), rest days in between.
const SPLITS = {
  2: { split: 'full-body', days: [[1, 'fb-a'], [4, 'fb-b']] },
  4: { split: 'upper-lower', days: [[1, 'upper-a'], [2, 'lower-a'], [4, 'upper-b'], [5, 'lower-b']] },
  5: { split: 'ppl-upper-lower', days: [[1, 'push'], [2, 'pull'], [3, 'legs'], [5, 'upper-a'], [6, 'lower-a']] }
}
const THREE = {
  strength: { split: '5x5', days: [[1, '5x5-a'], [3, '5x5-b'], [5, '5x5-c']] },
  hypertrophy: { split: 'ppl', days: [[1, 'push'], [3, 'pull'], [5, 'legs']] },
  recomposition: { split: 'full-body', days: [[1, 'fb-a'], [3, 'fb-b'], [5, 'fb-c']] }
}

export const normalizeProfile = (profile = {}) => {
  const days = Math.round(Number(profile.daysAvailable))
  return {
    gender: GENDERS.includes(profile.gender) ? profile.gender : null,
    daysAvailable: Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)) : 3,
    goal: GOALS.includes(profile.goal) ? profile.goal : 'hypertrophy'
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
  if (p.daysAvailable === 3) return THREE[p.goal]
  const base = SPLITS[p.daysAvailable]
  // Lower emphasis trains the legs first in the week, when fresh: lower-a, upper-a, lower-b, upper-b.
  return p.daysAvailable === 4 && emphasis === 'lower' ? { ...base, days: swapPairs(base.days) } : base
}

// Goal first (sets and reps), then at most one extra set per session on the emphasised half.
function volumeAdjuster(goal, emphasis) {
  const bumped = new Set()
  return (key, id, sets, reps) => {
    let s = sets, r = reps
    if (goal === 'strength' && reps <= 8) { s = Math.min(5, Math.max(sets, 4)); r = 5 }
    else if (goal === 'hypertrophy' && reps < 8) r = 8
    else if (goal === 'recomposition' && reps >= 10) r = Math.min(15, reps + 2)
    const legs = LEG_PARTS.has(EXIDX[id]?.bp)
    const favoured = emphasis === 'lower' ? legs : emphasis === 'upper' ? !legs : false
    if (favoured && !bumped.has(key) && s <= 3 && goal !== 'strength') { s += 1; bumped.add(key) }
    return [s, r]
  }
}

/**
 * The suggestion for a profile: { gender, daysAvailable, goal, emphasis, split, schedule, adjust }.
 * `schedule` is [[weekday, routineKey], …] with exactly daysAvailable entries (2 to 5). Inputs out
 * of range or unknown fall back to 3 days, hypertrophy and no gender.
 */
export function recommendRoutines(profile, { emphasis: override } = {}) {
  const p = normalizeProfile(profile)
  const emphasis = emphasisFor(p, override)
  const { split, days } = layoutFor(p, emphasis)
  return { ...p, emphasis, split, schedule: days.map(d => [...d]), adjust: volumeAdjuster(p.goal, emphasis) }
}

/** The suggestion plus fresh routines and weekdays, ready for the same save path as a starter plan. */
export function buildRecommendedPlan(profile, { equipment, emphasis } = {}) {
  const rec = recommendRoutines(profile, { emphasis })
  const plan = buildPlanFromKeys(rec.schedule, { equipment, adjust: rec.adjust })
  return plan && { ...rec, plan }
}
